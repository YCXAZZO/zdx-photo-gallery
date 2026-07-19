import { get, set } from '../lib/redis.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { type, src, video, creatorId, message, category, date, isFeatured, isActive } = req.body;

        // 基本校验
        if (!type || !src || !creatorId || !category) {
            return res.status(400).json({ success: false, error: '缺少必填字段' });
        }

        // 读取现有列表
        const data = await get('fans:list');
        const list = data ? JSON.parse(data) : [];

        // 生成唯一 ID
        const id = `fans_${Date.now()}_${String(list.length + 1).padStart(3, '0')}`;

        const newItem = {
            id,
            type,
            src,
            video: video || '',
            creatorId,
            message: message || '',
            category,
            date: date || new Date().toISOString().slice(0, 10),
            isFeatured: isFeatured || false,
            isActive: isActive !== undefined ? isActive : true,
        };

        list.push(newItem);
        await set('fans:list', JSON.stringify(list));

        res.status(200).json({ success: true, data: newItem });
    } catch (error) {
        console.error('添加粉丝作品失败:', error);
        res.status(500).json({ success: false, error: '添加失败' });
    }
}
