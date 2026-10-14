import json
from pathlib import Path

import pytest

from catalog import pricing
from catalog.models import Product
from monitoring import events
from orders.models import Order

GOLDEN = json.loads((Path(__file__).resolve().parents[1] / "catalog/fixtures/price_golden.json").read_text())
CUSTOMER = {"name": "Ada Gold", "email": "ada@example.com", "phone": "+1 555 010 2030", "address": "1 Bullion Row",
            "city": "New York", "postal": "10001", "country": "United States", "notes": ""}


def body(qty=1, slug="aurora-solitaire", total=None, delivery="insured", **cfg):
    product = Product.objects.get(slug=slug).data
    config = {**product["defaults"], **cfg}
    unit = pricing.price(product, config, 133.23)
    sub = unit * qty
    return {"customer": CUSTOMER, "delivery": delivery, "lines": [{"slug": slug, "config": config, "qty": qty}],
            "total": total if total is not None else sub + pricing.shipping(sub, delivery)}


# --- spot -------------------------------------------------------------------------------------------------------

def test_spot_default_and_etag(client):
    r = client.get("/api/v1/spot/")
    assert r.status_code == 200 and r.json() == {"perGram": 133.23, "asOf": "2026-10-06"}
    assert r["Cache-Control"] == "public, max-age=30"
    r2 = client.get("/api/v1/spot/", HTTP_IF_NONE_MATCH=r["ETag"])
    assert r2.status_code == 304


def test_spot_update_owner_only(client, owner_client):
    assert client.put("/api/v1/spot/", {"perGram": 140, "asOf": "2026-10-14"}, format="json").status_code == 401
    r = owner_client.put("/api/v1/spot/", {"perGram": "140.10", "asOf": "2026-10-14"}, format="json")
    assert r.status_code == 200 and r.json() == {"perGram": 140.1, "asOf": "2026-10-14"}
    assert client.get("/api/v1/spot/").json()["perGram"] == 140.1
    assert ("spot", ) == tuple(k for k, e in events.sent if e["type"] == "spot.updated")


def test_spot_rejects_absurd_price(owner_client):
    r = owner_client.put("/api/v1/spot/", {"perGram": 5, "asOf": "2026-10-14"}, format="json")
    assert r.status_code == 400 and r.json()["error"] == "invalid" and "perGram" in r.json()["fields"]


# --- orders -----------------------------------------------------------------------------------------------------

def test_place_order_reprices_on_server(client, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        r = client.post("/api/v1/orders/", body(qty=2), format="json", HTTP_IDEMPOTENCY_KEY="SLN-ABCDEF")
    assert r.status_code == 201, r.json()
    o = r.json()
    case = next(c for c in GOLDEN["cases"] if c["slug"] == "aurora-solitaire" and c["config"]["karat"] == 18
                and c["config"]["variant"] == 0 and c["config"]["size"] == "7" and not c["config"]["engraving"])
    assert o["code"] == "SLN-ABCDEF" and o["status"] == "received"
    assert o["lines"][0]["unit"] == case["total"] and o["lines"][0]["summary"] == case["summary"]
    assert o["subtotal"] == case["total"] * 2 and o["shipping"] == 0 and o["total"] == o["subtotal"]
    assert o["spotPerGram"] == 133.23 and o["spotAsOf"] == "2026-10-06"
    assert [e["type"] for _, e in events.sent if e["type"] == "order.created"] == ["order.created"]


def test_unsized_product_has_no_size_key(client):
    r = client.post("/api/v1/orders/", body(slug=Product.objects.filter(data__sizes=None).first().slug), format="json")
    assert r.status_code == 201, r.json()
    assert "size" not in r.json()["lines"][0]["config"]


def test_idempotent_retry_returns_same_order(client):
    b = body()
    first = client.post("/api/v1/orders/", b, format="json", HTTP_IDEMPOTENCY_KEY="SLN-RETRY2")
    again = client.post("/api/v1/orders/", b, format="json", HTTP_IDEMPOTENCY_KEY="SLN-RETRY2")
    assert (first.status_code, again.status_code) == (201, 200)
    assert again.json() == first.json() and Order.objects.count() == 1


def test_same_code_different_order_conflicts(client):
    client.post("/api/v1/orders/", body(), format="json", HTTP_IDEMPOTENCY_KEY="SLN-CLASH2")
    r = client.post("/api/v1/orders/", body(qty=3), format="json", HTTP_IDEMPOTENCY_KEY="SLN-CLASH2")
    assert r.status_code == 409 and r.json()["error"] == "code-in-use"


def test_stale_total_gets_new_quote(client):
    b = body()
    r = client.post("/api/v1/orders/", {**b, "total": b["total"] - 50}, format="json")
    assert r.status_code == 409
    j = r.json()
    assert j["error"] == "price-changed" and j["quote"]["total"] == b["total"] and j["spot"]["perGram"] == 133.23
    assert Order.objects.count() == 0


@pytest.mark.parametrize("bad", [{"karat": 24, "color": "rose"}, {"variant": 7}, {"size": "99"},
                                 {"engraving": "X" * 19}, {"finish": "hammered"}])
def test_rejects_impossible_configs(client, bad):
    r = client.post("/api/v1/orders/", body(total=0, **bad), format="json")
    assert r.status_code == 400 and r.json()["error"] in {"invalid-config", "invalid"}


def test_rejects_unknown_product_and_bad_key(client):
    b = body()
    b["lines"][0]["slug"] = "no-such-thing"
    assert client.post("/api/v1/orders/", b, format="json").json()["error"] == "unknown-product"
    r = client.post("/api/v1/orders/", body(), format="json", HTTP_IDEMPOTENCY_KEY="hello")
    assert r.status_code == 400 and r.json()["error"] == "invalid-key"


def test_customer_validation(client):
    b = body()
    b["customer"] = {**CUSTOMER, "email": "nope", "phone": "12"}
    r = client.post("/api/v1/orders/", b, format="json")
    assert r.status_code == 400 and set(r.json()["fields"]["customer"]) == {"email", "phone"}


def test_listing_is_owner_only_and_query_bounded(client, owner_client, django_assert_max_num_queries):
    for i in range(5):
        client.post("/api/v1/orders/", body(qty=i + 1), format="json")
    assert client.get("/api/v1/orders/").status_code == 401
    with django_assert_max_num_queries(3):  # auth user + orders page + prefetched lines, independent of page size
        r = owner_client.get("/api/v1/orders/?limit=3")
    j = r.json()
    assert len(j["results"]) == 3 and j["next"] and j["results"][0]["lines"][0]["qty"] == 5
    assert len(owner_client.get(j["next"]).json()["results"]) == 2


def test_status_transitions(client, owner_client):
    code = client.post("/api/v1/orders/", body(), format="json").json()["code"]
    assert owner_client.patch(f"/api/v1/orders/{code}/", {"status": "shipped"}, format="json").status_code == 409
    assert owner_client.patch(f"/api/v1/orders/{code}/", {"status": "confirmed"}, format="json").json()["status"] == "confirmed"
    assert owner_client.get("/api/v1/orders/?status=confirmed").json()["results"][0]["code"] == code
    assert owner_client.get("/api/v1/orders/SLN-NOPE22/").status_code == 404


def test_order_throttle(client, monkeypatch):
    from rest_framework.throttling import SimpleRateThrottle

    # Rates are read into the class at import time, so patch the class rather than settings.
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {"anon": "1000/min", "orders": "2/hour", "auth": "2/min"})
    codes = [client.post("/api/v1/orders/", body(), format="json").status_code for _ in range(3)]
    assert codes == [201, 201, 429]
    r = client.post("/api/v1/orders/", body(), format="json")
    assert r.json()["error"] == "throttled" and r.json()["retryAfter"] > 0


# --- auth -------------------------------------------------------------------------------------------------------

def test_owner_sign_in_refresh_logout(client, owner):
    bad = client.post("/api/v1/auth/token/", {"email": owner.email, "password": "wrong"}, format="json")
    assert bad.status_code == 401 and bad.json()["error"] == "bad-credentials"

    r = client.post("/api/v1/auth/token/", {"email": owner.email, "password": "a-long-test-password"}, format="json")
    assert r.status_code == 200 and r.json()["user"]["isOwner"] is True
    cookie = r.cookies["solenne_refresh"]
    assert cookie["httponly"] and cookie["path"] == "/api/v1/auth/" and cookie["samesite"] == "Strict"
    assert "refresh" not in r.json()

    assert client.post("/api/v1/auth/refresh/").status_code == 403  # missing X-Requested-With
    r2 = client.post("/api/v1/auth/refresh/", HTTP_X_REQUESTED_WITH="fetch")
    assert r2.status_code == 200
    me = client.get("/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {r2.json()['access']}")
    assert me.json() == {"authenticated": True, "isOwner": True, "email": owner.email}

    assert client.post("/api/v1/auth/logout/", HTTP_X_REQUESTED_WITH="fetch").status_code == 204
    client.cookies["solenne_refresh"] = r2.cookies["solenne_refresh"].value
    assert client.post("/api/v1/auth/refresh/", HTTP_X_REQUESTED_WITH="fetch").status_code == 401


def test_refresh_token_single_use(client, owner):
    r = client.post("/api/v1/auth/token/", {"email": owner.email, "password": "a-long-test-password"}, format="json")
    old = r.cookies["solenne_refresh"].value
    assert client.post("/api/v1/auth/refresh/", HTTP_X_REQUESTED_WITH="fetch").status_code == 200
    client.cookies["solenne_refresh"] = old
    assert client.post("/api/v1/auth/refresh/", HTTP_X_REQUESTED_WITH="fetch").status_code == 401


# --- infra ------------------------------------------------------------------------------------------------------

def test_health_and_request_id(client):
    r = client.get("/api/v1/health/", HTTP_X_REQUEST_ID="abc123")
    assert r.status_code == 200 and r.json()["db"] == "ok"
    assert r["X-Request-ID"] == "abc123" and r["X-Served-By"]


def test_unknown_endpoint_is_json(client):
    r = client.get("/api/v1/nope/")
    assert r.status_code == 404 and r.json()["error"] == "not_found"
