import fs from 'fs';
import path from 'path';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

function getTimestampFromFileName(fileName) {
    const match = fileName.match(/(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        const year = 2000 + parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        return new Date(year, month, day).getTime();
    }
    return null;
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

    // ===== 定义需要排除的目录前缀（可扩展） =====
    const excludedPrefixes = ['fans/', 'background/'];

    const imageObjects = [];
    const videoObjects = [];

    // ===== 第一轮遍历：过滤并分类 =====
    objects.forEach(obj => {
        // 1. 排除目录
        if (excludedPrefixes.some(prefix => obj.Key.startsWith(prefix))) {
            return;
        }
        // 2. 排除封面图（-cover.jpg）
        if (obj.Key.includes('-cover.jpg')) {
            return;
        }

        const ext = path.extname(obj.Key).toLowerCase();
        if (imageExtensions.includes(ext)) {
            imageObjects.push(obj);
        } else if (videoExtensions.includes(ext)) {
            videoObjects.push(obj);
        }
    });

    console.log(`📸 找到图片 ${imageObjects.length} 个，视频 ${videoObjects.length} 个`);

    const imageList = [];
    const usedVideoKeys = new Set();

    // 处理图片（含 Live Photo）
    imageObjects.forEach(imgObj => {
        const imgKey = imgObj.Key;
        const baseName = path.basename(imgKey, path.extname(imgKey));
        const matchedVideo = videoObjects.find(vObj => {
            const vBase = path.basename(vObj.Key, path.extname(vObj.Key));
            return vBase === baseName;
        });

        const fileName = path.basename(imgKey);
        let timestamp = getTimestampFromFileName(fileName);
        if (timestamp === null) {
            timestamp = imgObj.LastModified.getTime();
            console.warn(`⚠️ 无法从文件名 "${fileName}" 解析日期，回退到 LastModified`);
        }

        const item = {
            src: `${R2_PUBLIC_URL}/${imgKey}`,
            alt: `黛溪 · ${baseName}`,
            timestamp: timestamp,
        };
        if (matchedVideo) {
            item.video = `${R2_PUBLIC_URL}/${matchedVideo.Key}`;
            usedVideoKeys.add(matchedVideo.Key);
        }
        imageList.push(item);
    });

    // 处理纯视频（未配对的视频）
    videoObjects.forEach(vObj => {
        if (usedVideoKeys.has(vObj.Key)) return;
        const vKey = vObj.Key;
        const baseName = path.basename(vKey, path.extname(vKey));
        const fileName = path.basename(vKey);
        let timestamp = getTimestampFromFileName(fileName);
        if (timestamp === null) {
            timestamp = vObj.LastModified.getTime();
            console.warn(`⚠️ 无法从文件名 "${fileName}" 解析日期，回退到 LastModified`);
        }

        // ===== 检查是否存在同名封面图 =====
        const posterKey = vKey.replace(/\.(mp4|mov|m4v)$/, '-cover.jpg');
        const hasPoster = objects.some(obj => obj.Key === posterKey);

        const url = `${R2_PUBLIC_URL}/${vKey}`;
        const item = {
            src: url,
            video: url,
            alt: `黛溪 · ${baseName}`,
            timestamp: timestamp,
            isVideoOnly: true,
        };
        if (hasPoster) {
            item.poster = `${R2_PUBLIC_URL}/${posterKey}`;
        }
        imageList.push(item);
    });

    // 排序
    if (SORT_ORDER.toLowerCase() === 'desc') {
        imageList.sort((a, b) => b.timestamp - a.timestamp);
        console.log('⏱️ 排序方向：最新在前 (desc)');
    } else {
        imageList.sort((a, b) => a.timestamp - b.timestamp);
        console.log('⏱️ 排序方向：最早在前 (asc)');
    }

    fs.writeFileSync('data.json', JSON.stringify(imageList, null, 2), 'utf-8');
    console.log(`✅ 已生成 data.json，共 ${imageList.length} 个条目（含纯视频）`);
}

main().catch(err => {
    console.error('❌ 构建过程中发生意外错误:', err);
    process.exit(1);
});
