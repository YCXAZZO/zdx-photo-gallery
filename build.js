const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// 允许的图片扩展名（大小写不敏感）
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const videoExtensions = ['.mov', '.mp4', '.m4v'];

// 环境变量读取
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// 验证必要的环境变量
if (!R2_PUBLIC_URL || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('❌ 缺少必要的环境变量。请确保已设置：');
    console.error('   R2_PUBLIC_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
    process.exit(1);
}

// 创建 S3 客户端（指向 R2）
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * 从 R2 获取所有文件列表（自动处理分页）
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
                objects.push(...response.Contents.map(item => item.Key));
            }
            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
        }
    } catch (error) {
        console.error('❌ 调用 R2 ListObjectsV2 失败:', error.message);
        // 如果错误是权限问题，给出详细提示
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

    let fileKeys = [];
    try {
        fileKeys = await listAllObjects();
        console.log(`✅ 从 R2 获取到 ${fileKeys.length} 个对象`);
    } catch (error) {
        console.error('❌ 无法从 R2 获取文件列表，构建终止');
        process.exit(1);
    }

    if (fileKeys.length === 0) {
        console.warn('⚠️ R2 存储桶中没有找到任何文件。');
        // 生成空 data.json 并退出
        fs.writeFileSync('data.json', JSON.stringify([], null, 2));
        console.log('✅ 已生成空的 data.json');
        return;
    }

    // 按文件名排序（可选）
    fileKeys.sort();

    // 分离图片和视频
    const imageFiles = [];
    const videoFiles = [];

    fileKeys.forEach(key => {
        const ext = path.extname(key).toLowerCase();
        if (imageExtensions.includes(ext)) {
            imageFiles.push(key);
        } else if (videoExtensions.includes(ext)) {
            videoFiles.push(key);
        }
        // 其他文件忽略
    });

    console.log(`📸 找到图片 ${imageFiles.length} 个，视频 ${videoFiles.length} 个`);

    // 构建图片列表
    const imageList = [];

    imageFiles.forEach(imgKey => {
        const baseName = path.basename(imgKey, path.extname(imgKey)); // 不含扩展名的文件名
        // 查找同名视频（不区分目录，只要文件名基础相同即可）
        const matchedVideo = videoFiles.find(vKey => {
            const vBase = path.basename(vKey, path.extname(vKey));
            return vBase === baseName;
        });

        // 构建对象
        const item = {
            src: `${R2_PUBLIC_URL}/${imgKey}`,
            alt: `黛溪 · ${baseName}`,
        };
        if (matchedVideo) {
            item.video = `${R2_PUBLIC_URL}/${matchedVideo}`;
        }
        imageList.push(item);
    });

    // 写入 data.json
    const outputFile = path.join(__dirname, 'data.json');
    fs.writeFileSync(outputFile, JSON.stringify(imageList, null, 2), 'utf-8');
    console.log(`✅ 已生成 data.json，共 ${imageList.length} 张图片（含 Live Photo）`);
}

// 执行
main().catch(err => {
    console.error('❌ 构建过程中发生意外错误:', err);
    process.exit(1);
});
