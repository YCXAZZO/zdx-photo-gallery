import { Redis } from '@upstash/redis';

// 从环境变量读取 Upstash 配置
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 读取键前缀（如果保留）
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'default:';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const pinned = await redis.get(`${KEY_PREFIX}pinned`) || [];
        res.status(200).json({ pinned });
    } catch (error) {
        console.error('读取置顶列表失败:', error);
        res.status(500).json({ error: '读取失败: ' + error.message });
    }
}
