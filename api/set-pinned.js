// api/set-pinned.js
import { set } from '../../lib/redis.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const { pinned } = req.body;
    if (!Array.isArray(pinned)) {
        return res.status(400).json({ error: 'pinned must be an array' });
    }
    try {
        await set('pinned', JSON.stringify(pinned));
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('保存置顶列表失败:', error);
        res.status(500).json({ error: '保存失败' });
    }
}
