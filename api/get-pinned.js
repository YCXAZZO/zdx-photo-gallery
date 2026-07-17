import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const pinned = await kv.get('pinned') || [];
        res.status(200).json({ pinned });
    } catch (error) {
        console.error('读取置顶列表失败:', error);
        res.status(500).json({ error: '读取失败: ' + error.message });
    }
}
