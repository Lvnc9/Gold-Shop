"""Fire-and-forget Kafka producer. Monitoring must never slow down or fail a customer's request: produce() only
enqueues into librdkafka's buffer, a full buffer or a dead broker drops the event and logs once a minute."""

import atexit
import json
import logging
import threading
import time
from datetime import UTC, datetime

from django.conf import settings

from solenne.middleware import INSTANCE, request_id

log = logging.getLogger(__name__)
_producer = None
_lock = threading.Lock()
_last_warn = 0.0

# Tests and local dev without Kafka can read what would have been sent.
sent: list[tuple[str, dict]] = []


def _get_producer():
    global _producer
    if _producer is None:
        with _lock:
            if _producer is None:
                from confluent_kafka import Producer  # imported lazily: optional outside the compose stack

                _producer = Producer({
                    "bootstrap.servers": settings.KAFKA["bootstrap"],
                    "client.id": f"solenne-api-{INSTANCE}",
                    "linger.ms": 50,                  # batch request metrics instead of one send per request
                    "compression.type": "lz4",
                    "acks": "1",
                    "queue.buffering.max.messages": 100_000,
                    "message.timeout.ms": 10_000,
                    "socket.timeout.ms": 3_000,
                })
                atexit.register(lambda: _producer.flush(3))
    return _producer


def _warn(msg, *args):
    global _last_warn
    if time.monotonic() - _last_warn > 60:
        _last_warn = time.monotonic()
        log.warning(msg, *args)


def emit(topic_key: str, payload: dict, key: str | None = None):
    event = {"ts": datetime.now(UTC).isoformat(timespec="milliseconds"), "instance": INSTANCE,
             "requestId": request_id.get(), **payload}
    if not settings.KAFKA["enabled"]:
        if len(sent) < 1000:
            sent.append((topic_key, event))
        return
    topic = settings.KAFKA["topics"][topic_key]
    try:
        p = _get_producer()
        p.produce(topic, json.dumps(event).encode(), key=key.encode() if key else None,
                  on_delivery=lambda err, _msg: err and _warn("kafka delivery failed: %s", err))
        p.poll(0)  # serve delivery callbacks without blocking
    except BufferError:
        _warn("kafka buffer full; dropping %s events", topic)
    except Exception as e:  # noqa: BLE001 — never let monitoring break a request
        _warn("kafka unavailable: %s", e)
