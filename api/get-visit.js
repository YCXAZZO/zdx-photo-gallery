import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'default:';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const count = await redis.incr(`${KEY_PREFIX}visit_count`);
        res.status(200).json({ count });
    } catch (error) {
        console.error('访客计数失败:', error);
        res.status(200).json({ count: 0 });
    }
}
