import { get } from '../lib/redis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const count = await get('visit_count');
        const num = count ? parseInt(count, 10) : 0;
        res.status(200).json({ count: num });
    } catch (error) {
        console.error('读取访客数失败:', error);
        res.status(500).json({ error: '读取失败' });
    }
}
