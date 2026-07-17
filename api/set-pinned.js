import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { pinned } = req.body;
    if (!Array.isArray(pinned)) {
        return res.status(400).json({ error: 'pinned must be an array' });
    }

    try {
        await redis.set('pinned', pinned);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('保存置顶列表失败:', error);
        res.status(500).json({ error: '保存失败: ' + error.message });
    }
}
