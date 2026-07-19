// api/fans/upload.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // 记录请求开始
    console.log('📤 Upload API called');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const form = new formidable.IncomingForm({
            maxFileSize: 4 * 1024 * 1024, // 4MB
            keepExtensions: true,
        });

        // 用 Promise 包装 form.parse
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ fields, files });
                }
            });
        });

        console.log('✅ Form parsed successfully');

        // 验证密码
        const adminPassword = process.env.ADMIN_PASSWORD || '2432';
        if (fields.password !== adminPassword) {
            return res.status(403).json({ error: 'Invalid password' });
        }

        const file = files.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // 检查环境变量
        const {
            R2_ACCOUNT_ID,
            R2_ACCESS_KEY_ID,
            R2_SECRET_ACCESS_KEY,
            R2_BUCKET_NAME,
            R2_PUBLIC_URL,
        } = process.env;

        console.log('🔑 R2 env check:', {
            R2_ACCOUNT_ID: R2_ACCOUNT_ID ? '✅' : '❌',
            R2_ACCESS_KEY_ID: R2_ACCESS_KEY_ID ? '✅' : '❌',
            R2_SECRET_ACCESS_KEY: R2_SECRET_ACCESS_KEY ? '✅' : '❌',
            R2_BUCKET_NAME: R2_BUCKET_NAME ? '✅' : '❌',
            R2_PUBLIC_URL: R2_PUBLIC_URL ? '✅' : '❌',
        });

        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
            console.error('❌ Missing R2 environment variables');
            return res.status(500).json({ error: 'Server configuration error: missing R2 env vars' });
        }

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });

        const originalName = file.originalFilename || 'file';
        const ext = originalName.split('.').pop() || 'bin';
        const fileName = `fans_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const key = `fans/${fileName}`;

        const fileStream = fs.createReadStream(file.filepath);

        const uploadParams = {
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileStream,
            ContentType: file.mimetype || 'application/octet-stream',
        };

        console.log(`⬆️ Uploading to R2: ${key}`);
        await s3Client.send(new PutObjectCommand(uploadParams));
        console.log('✅ Upload to R2 successful');

        const publicUrl = `${R2_PUBLIC_URL}/${key}`;
        res.status(200).json({ success: true, url: publicUrl, key });
    } catch (error) {
        console.error('❌ Upload error:', error);
        // 判断错误类型
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: '文件大小超过4MB限制' });
        }
        // 其他错误返回通用500，但包含错误信息以便调试
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
}
