// lib/redis.js
import { createClient } from 'redis';

// 从环境变量读取
const REDIS_URL = process.env.REDIS_URL;
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'default:';

// 创建 Redis 客户端（只初始化一次，复用连接）
let redisClient = null;

async function getRedisClient() {
    if (!redisClient) {
        redisClient = createClient({ url: REDIS_URL });
        await redisClient.connect();
    }
    return redisClient;
}

// 生成带前缀的键名
function prefixedKey(key) {
    return `${KEY_PREFIX}${key}`;
}

// 封装常用操作
export async function get(key) {
    const client = await getRedisClient();
    return client.get(prefixedKey(key));
}

export async function set(key, value) {
    const client = await getRedisClient();
    return client.set(prefixedKey(key), value);
}

export async function incr(key) {
    const client = await getRedisClient();
    return client.incr(prefixedKey(key));
}

export async function del(key) {
    const client = await getRedisClient();
    return client.del(prefixedKey(key));
}
