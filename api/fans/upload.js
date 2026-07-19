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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const form = formidable({
        maxFileSize: 4 * 1024 * 1024,
        keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Form parse error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: '文件大小超过4MB限制' });
            }
            return res.status(500).json({ error: 'Form parse error: ' + err.message });
        }

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

        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
            console.error('Missing R2 environment variables');
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

        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: fileStream,
                ContentType: file.mimetype || 'application/octet-stream',
            }));
            const publicUrl = `${R2_PUBLIC_URL}/${key}`;
            res.status(200).json({ success: true, url: publicUrl, key });
        } catch (error) {
            console.error('Upload to R2 failed:', error);
            res.status(500).json({ error: 'Upload to R2 failed: ' + error.message });
        }
    });
}
