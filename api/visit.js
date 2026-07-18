import { incr, get } from '../../lib/redis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        // 使用 incr 原子操作（内部已自动加前缀）
        const count = await incr('visit_count');
        res.status(200).json({ count });
    } catch (error) {
        console.error('访客计数失败:', error);
        res.status(200).json({ count: 0 });
    }
}
