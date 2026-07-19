import { get, set } from '../../lib/redis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, error: '缺少 ID' });
        }

        const data = await get('fans:list');
        const list = data ? JSON.parse(data) : [];
        const newList = list.filter(item => item.id !== id);
        if (newList.length === list.length) {
            return res.status(404).json({ success: false, error: '作品不存在' });
        }

        await set('fans:list', JSON.stringify(newList));
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('删除粉丝作品失败:', error);
        res.status(500).json({ success: false, error: '删除失败' });
    }
}
