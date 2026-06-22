import redis
from backend.config import REDIS_HOST, REDIS_PORT

pool = redis.ConnectionPool(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def get_redis():
    return redis.Redis(connection_pool=pool)
