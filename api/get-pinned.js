import { Redis } from '@upstash/redis';

// 检查环境变量
if (!process.env.REDIS_URL) {
  console.error('❌ REDIS_URL is not set');
}

const redis = new Redis({
  url: process.env.REDIS_URL,
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const pinned = await redis.get('pinned') || [];
        res.status(200).json({ pinned });
    } catch (error) {
        console.error('读取置顶列表失败:', error);
        res.status(500).json({ 
            error: '读取失败: ' + error.message,
            env: process.env.REDIS_URL ? 'set' : 'missing'  // 辅助调试
        });
    }
}
