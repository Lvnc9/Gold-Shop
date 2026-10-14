"""Rollup logic for the consumer, kept separate from Kafka I/O so tests feed it plain dicts."""

from collections import defaultdict
from datetime import datetime

from django.db import transaction
from django.db.models import F
from django.db.models.functions import Greatest

from .models import MetricBucket, OrderEvent


def _minute(ts: str) -> datetime:
    return datetime.fromisoformat(ts).replace(second=0, microsecond=0)


@transaction.atomic
def apply(batch: list[tuple[str, dict]]):
    """Fold a polled batch into the DB: one upsert per (minute, method, route) instead of one per event."""
    agg = defaultdict(lambda: {"count": 0, "errors": 0, "client_errors": 0, "total_ms": 0.0, "max_ms": 0.0})
    events = []
    for kind, e in batch:
        if kind == "requests":
            a = agg[(_minute(e["ts"]), e["method"], e["route"][:120])]
            a["count"] += 1
            a["errors"] += e["status"] >= 500
            a["client_errors"] += 400 <= e["status"] < 500
            a["total_ms"] += e["durationMs"]
            a["max_ms"] = max(a["max_ms"], e["durationMs"])
        else:
            events.append(OrderEvent(ts=datetime.fromisoformat(e["ts"]), type=e.get("type", kind),
                                     code=e.get("code", ""), total=e.get("total"), payload=e))
    for (minute, method, route), a in agg.items():
        bucket, created = MetricBucket.objects.get_or_create(minute=minute, method=method, route=route, defaults=a)
        if not created:
            MetricBucket.objects.filter(pk=bucket.pk).update(
                count=F("count") + a["count"], errors=F("errors") + a["errors"],
                client_errors=F("client_errors") + a["client_errors"], total_ms=F("total_ms") + a["total_ms"],
                max_ms=Greatest(F("max_ms"), a["max_ms"]),
            )
    OrderEvent.objects.bulk_create(events)
