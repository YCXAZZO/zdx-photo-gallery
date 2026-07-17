// api/visit.js
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
});

await redis.connect();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        // 获取当前访问次数，默认 0
        let count = await redis.get('visit_count');
        count = count ? parseInt(count, 10) : 0;
        // 增加 1
        count += 1;
        await redis.set('visit_count', count);
        res.status(200).json({ count });
    } catch (error) {
        console.error('访客计数失败:', error);
        // 即使出错也返回0，不阻塞页面
        res.status(200).json({ count: 0 });
    }
}
