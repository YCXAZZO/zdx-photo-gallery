import { Redis } from '@upstash/redis';

// 从环境变量读取 REDIS_URL
const redis = new Redis({
  url: process.env.REDIS_URL,
});

export default async function handler(req, res) {
    // 设置 CORS 头，允许跨域请求
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允许 POST 方法
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 校验请求体
    const { pinned } = req.body;
    if (!Array.isArray(pinned)) {
        return res.status(400).json({ error: 'pinned must be an array' });
    }

    try {
        // 保存置顶列表到 Redis
        await redis.set('pinned', pinned);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('保存置顶列表失败:', error);
        res.status(500).json({ error: '保存失败: ' + error.message });
    }
}
