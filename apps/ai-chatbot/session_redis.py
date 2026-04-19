"""Optional Redis: session correlation metadata (TTL) for multi-turn flows. Stateless inference."""
import json
import logging
import os
import time
from typing import Any, Optional, Union

logger = logging.getLogger(__name__)

_redis: Union[Any, None, bool] = None
_tried = False


def get_redis() -> Union[Any, None, bool]:
    """Returns client, None if REDIS_URL unset, or False if connection failed."""
    global _redis, _tried
    if _tried:
        return _redis
    _tried = True
    url = os.getenv("REDIS_URL", "").strip()
    if not url:
        _redis = None
        return None
    try:
        import redis as redis_lib

        r = redis_lib.from_url(
            url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2
        )
        r.ping()
        _redis = r
        logger.info("Redis connected for session metadata")
        return r
    except Exception as e:
        logger.warning("REDIS_URL set but Redis unavailable: %s", e)
        _redis = False
        return False


def touch_session(session_id: Optional[str], message_count: int) -> None:
    if not session_id:
        return
    r = get_redis()
    if r is None or r is False:
        return
    ttl = int(os.getenv("SESSION_METADATA_TTL_SEC", "86400"))
    if ttl <= 0:
        ttl = 86400
    key = "sp:chat:session:" + session_id
    try:
        r.setex(
            key,
            ttl,
            json.dumps({"msg_count": message_count, "ts": time.time()}),
        )
    except Exception as e:
        logger.debug("session touch failed: %s", e)


def redis_health() -> str:
    if not os.getenv("REDIS_URL", "").strip():
        return "skipped"
    r = get_redis()
    if r is None or r is False:
        return "error"
    try:
        r.ping()
        return "ok"
    except Exception:
        return "error"
