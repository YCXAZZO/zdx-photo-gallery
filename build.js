// 文件顶部，替换所有的 require
import fs from 'fs';
import path from 'path';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
// ... 其他代码保持不变

const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const videoExtensions = ['.mov', '.mp4', '.m4v'];

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const SORT_ORDER = process.env.SORT_ORDER || 'asc';

if (!R2_PUBLIC_URL || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('❌ 缺少必要的环境变量。');
    process.exit(1);
}

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function listAllObjects() {
    const objects = [];
    let isTruncated = true;
    let continuationToken = undefined;
    try {
        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: R2_BUCKET_NAME,
                ContinuationToken: continuationToken,
            });
            const response = await s3Client.send(command);
            if (response.Contents) {
                objects.push(...response.Contents.map(item => ({
                    Key: item.Key,
                    LastModified: item.LastModified,
                })));
            }
            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
        }
    } catch (error) {
        console.error('❌ 调用 R2 ListObjectsV2 失败:', error.message);
        throw error;
    }
    return objects;
}

async function main() {
    console.log('📡 正在从 R2 获取文件列表...');
    let objects = [];
    try {
        objects = await listAllObjects();
        console.log(`✅ 从 R2 获取到 ${objects.length} 个对象`);
    } catch (error) {
        console.error('❌ 无法从 R2 获取文件列表，构建终止');
        process.exit(1);
    }

    if (objects.length === 0) {
        fs.writeFileSync('data.json', JSON.stringify([], null, 2));
        console.log('✅ 已生成空的 data.json');
        return;
    }

    const imageObjects = [];
    const videoObjects = [];

    objects.forEach(obj => {
        const ext = path.extname(obj.Key).toLowerCase();
        if (imageExtensions.includes(ext)) {
            imageObjects.push(obj);
        } else if (videoExtensions.includes(ext)) {
            videoObjects.push(obj);
        }
    });

    console.log(`📸 找到图片 ${imageObjects.length} 个，视频 ${videoObjects.length} 个`);

    const imageList = [];

    imageObjects.forEach(imgObj => {
        const imgKey = imgObj.Key;
        const baseName = path.basename(imgKey, path.extname(imgKey));
        const matchedVideo = videoObjects.find(vObj => {
            const vBase = path.basename(vObj.Key, path.extname(vObj.Key));
            return vBase === baseName;
        });

        const item = {
            src: `${R2_PUBLIC_URL}/${imgKey}`,
            alt: `黛溪 · ${baseName}`,
            timestamp: imgObj.LastModified.getTime(),
        };
        if (matchedVideo) {
            item.video = `${R2_PUBLIC_URL}/${matchedVideo.Key}`;
        }
        imageList.push(item);
    });

    // 按时间排序（默认升序，可通过环境变量 SORT_ORDER 调整）
    if (SORT_ORDER.toLowerCase() === 'desc') {
        imageList.sort((a, b) => b.timestamp - a.timestamp);
        console.log('⏱️ 排序方向：最新在前 (desc)');
    } else {
        imageList.sort((a, b) => a.timestamp - b.timestamp);
        console.log('⏱️ 排序方向：最早在前 (asc)');
    }

    // 直接输出 imageList（保留 timestamp）
    fs.writeFileSync('data.json', JSON.stringify(imageList, null, 2), 'utf-8');
    console.log(`✅ 已生成 data.json，共 ${imageList.length} 张图片（含 Live Photo）`);
}

main().catch(err => {
    console.error('❌ 构建过程中发生意外错误:', err);
    process.exit(1);
});
