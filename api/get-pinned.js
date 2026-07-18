// api/get-pinned.js
import { get } from '../../lib/redis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const pinned = await get('pinned') || '[]';
        const parsed = typeof pinned === 'string' ? JSON.parse(pinned) : pinned;
        res.status(200).json({ pinned: parsed });
    } catch (error) {
        console.error('读取置顶列表失败:', error);
        res.status(500).json({ error: '读取失败' });
    }
}
