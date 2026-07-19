import { get, set } from '../../lib/redis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { id, type, src, video, creatorId, message, category, date, isFeatured, isActive } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, error: '缺少 ID' });
        }

        const data = await get('fans:list');
        const list = data ? JSON.parse(data) : [];
        const index = list.findIndex(item => item.id === id);
        if (index === -1) {
            return res.status(404).json({ success: false, error: '作品不存在' });
        }

        // 更新字段（仅更新传入的字段）
        const existing = list[index];
        list[index] = {
            ...existing,
            type: type || existing.type,
            src: src || existing.src,
            video: video !== undefined ? video : existing.video,
            creatorId: creatorId || existing.creatorId,
            message: message !== undefined ? message : existing.message,
            category: category || existing.category,
            date: date || existing.date,
            isFeatured: isFeatured !== undefined ? isFeatured : existing.isFeatured,
            isActive: isActive !== undefined ? isActive : existing.isActive,
        };

        await set('fans:list', JSON.stringify(list));

        res.status(200).json({ success: true, data: list[index] });
    } catch (error) {
        console.error('编辑粉丝作品失败:', error);
        res.status(500).json({ success: false, error: '编辑失败' });
    }
}
