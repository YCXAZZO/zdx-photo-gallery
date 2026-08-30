import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'default:';

function prefixedKey(key) {
    return `${KEY_PREFIX}${key}`;
}

export async function get(key) {
    return redis.get(prefixedKey(key));
}

export async function set(key, value) {
    return redis.set(prefixedKey(key), value);
}

export async function incr(key) {
    return redis.incr(prefixedKey(key));
}

export async function del(key) {
    return redis.del(prefixedKey(key));
}
