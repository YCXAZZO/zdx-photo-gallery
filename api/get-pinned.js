// api/get-pinned.js
export default async function handler(req, res) {
    // 允许跨域（如果需要）
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 从 Vercel KV 读取
    const { kv } = await import('@vercel/kv');

    try {
        const pinned = await kv.get('pinned') || [];
        res.status(200).json({ pinned });
    } catch (error) {
        console.error('读取置顶列表失败:', error);
        res.status(500).json({ error: '读取失败' });
    }
}