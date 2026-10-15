from datetime import UTC, datetime, timedelta

from catalog.models import Product
from monitoring import events
from monitoring.consumer import apply
from monitoring.models import MetricBucket


def _req(route, status, ms, ts):
    return ("requests", {"ts": ts.isoformat(), "type": "http.request", "method": "GET", "route": route,
                         "status": status, "durationMs": ms})


def test_middleware_emits_route_pattern(client):
    client.get("/api/v1/spot/")
    client.get("/api/v1/orders/SLN-ABCDEF/")
    client.get("/api/v1/health/")
    reqs = [e for k, e in events.sent if k == "requests"]
    assert [r["route"] for r in reqs] == ["/api/v1/spot/", "/api/v1/orders/<str:code>/"]
    assert reqs[1]["status"] == 401 and reqs[0]["durationMs"] >= 0 and reqs[0]["requestId"] != "-"


def test_rollup_and_stats(owner_client):
    now = datetime.now(UTC)
    batch = [_req("/api/v1/spot/", 200, 4.0, now), _req("/api/v1/spot/", 200, 10.0, now),
             _req("/api/v1/spot/", 502, 30.0, now), _req("/api/v1/orders/", 429, 1.0, now - timedelta(minutes=2)),
             ("orders", {"ts": now.isoformat(), "type": "order.created", "code": "SLN-AAAAAA", "total": 1200})]
    apply(batch)
    apply(batch[:1])  # a second batch in the same minute increments, not duplicates
    spot = MetricBucket.objects.get(route="/api/v1/spot/")
    assert (spot.count, spot.errors, spot.max_ms, spot.total_ms) == (4, 1, 30.0, 48.0)

    s = owner_client.get("/api/v1/monitor/stats/?minutes=60").json()
    assert s["requests"] == 5 and s["orders"] == 1 and s["revenue"] == 1200
    assert s["errorRate"] == 0.2 and s["clientErrorRate"] == 0.2 and s["maxMs"] == 30.0
    assert s["routes"][0]["route"] == "/api/v1/spot/" and len(s["timeline"]) == 2


def test_stats_owner_only(client):
    assert client.get("/api/v1/monitor/stats/").status_code == 401


def test_emit_never_raises_when_kafka_is_down(settings):
    settings.KAFKA = {**settings.KAFKA, "enabled": True, "bootstrap": "127.0.0.1:1"}
    events.emit("orders", {"type": "order.created"})  # must return immediately without raising
    assert Product.objects.exists()


def test_ensure_topics_is_idempotent(settings, monkeypatch):
    import sys
    import types

    from django.core.management import call_command

    created = []

    class FakeAdmin:
        def __init__(self, conf):
            pass

        def list_topics(self, timeout):
            return types.SimpleNamespace(topics={t: None for t in settings.KAFKA["topics"].values()})

        def create_topics(self, topics):
            created.append(topics)
            return {}

    fake = types.ModuleType("confluent_kafka.admin")
    fake.AdminClient, fake.NewTopic = FakeAdmin, lambda *a, **k: None
    monkeypatch.setitem(sys.modules, "confluent_kafka.admin", fake)
    settings.KAFKA = {**settings.KAFKA, "enabled": True}
    call_command("ensure_topics")  # every topic exists: must not call create_topics([])
    assert created == []
