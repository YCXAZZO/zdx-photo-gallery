import { createClient } from 'redis';

// 从环境变量读取 REDIS_URL
const redis = createClient({
  url: process.env.REDIS_URL,
});

// 连接 Redis
await redis.connect();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const pinned = await redis.get('pinned') || '[]';
        // 确保返回的是数组
        const parsed = typeof pinned === 'string' ? JSON.parse(pinned) : pinned;
        res.status(200).json({ pinned: parsed || [] });
    } catch (error) {
        console.error('读取置顶列表失败:', error);
        res.status(500).json({ error: '读取失败: ' + error.message });
    }
}
