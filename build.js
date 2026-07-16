// build.js
const fs = require('fs');
const path = require('path');

// 图片目录路径（本地开发时用于测试，正式环境图片从 R2 加载）
const imagesDir = path.join(__dirname, 'images');
const outputFile = path.join(__dirname, 'data.json');

// 允许的图片扩展名
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
// 允许的视频扩展名
const videoExtensions = ['.mov', '.mp4', '.m4v'];

// 读取 images 目录
fs.readdir(imagesDir, (err, files) => {
    if (err) {
        console.error('❌ 无法读取 images 目录:', err);
        process.exit(1);
    }

    files.sort();
    const imageList = [];

    files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        const baseName = path.basename(file, ext);

        if (imageExtensions.includes(ext)) {
            // 查找同名视频文件
            const videoFile = files.find(f => {
                const fExt = path.extname(f).toLowerCase();
                const fBase = path.basename(f, fExt);
                return fBase === baseName && videoExtensions.includes(fExt);
            });

            // 注意：这里使用 R2 的公共 URL 前缀，稍后配置
            const r2BaseUrl = process.env.R2_PUBLIC_URL || 'https://your-bucket.r2.dev';
            const item = {
                src: `${r2BaseUrl}/${file}`,
                alt: `黛溪 · ${baseName}`,
            };
            if (videoFile) {
                item.video = `${r2BaseUrl}/${videoFile}`;
            }
            imageList.push(item);
        }
    });

    fs.writeFileSync(outputFile, JSON.stringify(imageList, null, 2), 'utf-8');
    console.log(`✅ 已生成 data.json，共 ${imageList.length} 张图片（含 Live Photo）`);
});