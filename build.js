const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// 允许的图片扩展名
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const videoExtensions = ['.mov', '.mp4', '.m4v'];

// 环境变量读取
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// 排序方向：'asc' 或 'desc'，默认 'asc'（旧→新）
// 可以通过环境变量 SORT_ORDER 覆盖
const SORT_ORDER = process.env.SORT_ORDER || 'asc';

if (!R2_PUBLIC_URL || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('❌ 缺少必要的环境变量。请确保已设置：');
    console.error('   R2_PUBLIC_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
}

// 创建 S3 客户端
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * 从 R2 获取所有对象（含 LastModified）
 */
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
                // 保留 Key 和 LastModified
                objects.push(...response.Contents.map(item => ({
                    Key: item.Key,
                    LastModified: item.LastModified, // Date 对象
                })));
            }
            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
        }
    } catch (error) {
        console.error('❌ 调用 R2 ListObjectsV2 失败:', error.message);
        if (error.name === 'AccessDenied') {
            console.error('   请检查 R2_ACCESS_KEY_ID 和 R2_SECRET_ACCESS_KEY 是否正确，并确保 Token 有 ListObjects 权限。');
        }
        throw error;
    }

    return objects;
}

/**
 * 主函数
 */
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
        console.warn('⚠️ R2 存储桶中没有找到任何文件。');
        fs.writeFileSync('data.json', JSON.stringify([], null, 2));
        console.log('✅ 已生成空的 data.json');
        return;
    }

    // 分离图片和视频（保留对象信息）
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

    // 构建图片列表
    const imageList = [];

    imageObjects.forEach(imgObj => {
        const imgKey = imgObj.Key;
        const baseName = path.basename(imgKey, path.extname(imgKey));
        // 查找同名视频（不区分目录）
        const matchedVideo = videoObjects.find(vObj => {
            const vBase = path.basename(vObj.Key, path.extname(vObj.Key));
            return vBase === baseName;
        });

        const item = {
            src: `${R2_PUBLIC_URL}/${imgKey}`,
            alt: `黛溪 · ${baseName}`,
            // 记录时间（用于排序）
            timestamp: imgObj.LastModified.getTime(), // 毫秒时间戳
        };
        if (matchedVideo) {
            item.video = `${R2_PUBLIC_URL}/${matchedVideo.Key}`;
        }
        imageList.push(item);
    });

    // ===== 按时间排序 =====
    if (SORT_ORDER.toLowerCase() === 'desc') {
        // 新→旧
        imageList.sort((a, b) => b.timestamp - a.timestamp);
        console.log('⏱️ 排序方向：最新在前 (desc)');
    } else {
        // 旧→新（默认）
        imageList.sort((a, b) => a.timestamp - b.timestamp);
        console.log('⏱️ 排序方向：最早在前 (asc)');
    }

    // 移除 timestamp 字段（不输出到 data.json）
    const finalList = imageList.map(({ timestamp, ...rest }) => rest);

    // 写入 data.json
    fs.writeFileSync('data.json', JSON.stringify(finalList, null, 2), 'utf-8');
    console.log(`✅ 已生成 data.json，共 ${finalList.length} 张图片（含 Live Photo）`);
}

main().catch(err => {
    console.error('❌ 构建过程中发生意外错误:', err);
    process.exit(1);
});
