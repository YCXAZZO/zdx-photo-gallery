import { get } from '../../lib/redis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const data = await get('fans:list');
        const list = data ? JSON.parse(data) : [];
        res.status(200).json({ success: true, data: list });
    } catch (error) {
        console.error('获取粉丝作品列表失败:', error);
        res.status(500).json({ success: false, error: '获取失败' });
    }
}
