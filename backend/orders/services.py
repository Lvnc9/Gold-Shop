"""Order placement: validate against the catalogue, re-price on the server, store once (idempotent)."""

import hashlib
import json
import secrets
from dataclasses import dataclass

from django.db import IntegrityError, transaction

from catalog import pricing
from catalog.models import Product
from catalog.spot import current_spot
from solenne.errors import ApiError

from .models import Order, OrderLine

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
PRICE_TOLERANCE = 1  # dollars; a quote older than the last spot change is refused above this


def new_code() -> str:
    return "SLN-" + "".join(secrets.choice(ALPHABET) for _ in range(6))


@dataclass
class Placed:
    order: Order
    created: bool


def _check_config(product: dict, cfg: dict, slug: str) -> dict:
    """Same rules the configurator enforces; a hand-built request can't buy a 24k rose ring."""
    errors = []
    if cfg["color"] not in product["colors"]:
        errors.append("color")
    if cfg["karat"] not in product["karats"] or not pricing.color_allowed(cfg["karat"], cfg["color"]):
        errors.append("karat")
    if cfg["variant"] >= len(product["variants"]):
        errors.append("variant")
    if cfg["finish"] not in product["finishes"]:
        errors.append("finish")
    sizes = product.get("sizes")
    size = cfg.get("size") or None
    if sizes and size not in sizes["options"]:
        errors.append("size")
    engraving = cfg.get("engraving") or ""
    limit = (product.get("engraving") or {}).get("maxChars", 0)
    if len(engraving.strip()) > limit:
        errors.append("engraving")
    if errors:
        raise ApiError("invalid-config", f"{slug}: not available as configured ({', '.join(errors)}).", 400, fields=errors)
    return {**cfg, "size": size if sizes else None, "engraving": engraving}


def quote(lines: list[dict], delivery: str) -> dict:
    """Prices every line at the live spot. One query for all products in the order."""
    spot = current_spot()
    products = Product.objects.in_bulk([l["slug"] for l in lines])
    priced = []
    for l in lines:
        row = products.get(l["slug"])
        if row is None:
            raise ApiError("unknown-product", f"{l['slug']} is not in the catalogue.", 400)
        cfg = _check_config(row.data, dict(l["config"]), l["slug"])
        # The TS Config has no `size` key for unsized products; keep the stored config identical.
        if cfg["size"] is None:
            cfg.pop("size")
        unit = pricing.price(row.data, cfg, spot["perGram"])
        priced.append({"slug": row.slug, "name": row.name, "summary": pricing.config_summary(row.data, cfg),
                       "qty": l["qty"], "unit": unit, "config": cfg})
    subtotal = sum(p["unit"] * p["qty"] for p in priced)
    ship = pricing.shipping(subtotal, delivery)
    return {"spot": spot, "lines": priced, "subtotal": subtotal, "shipping": ship, "total": subtotal + ship}


def payload_hash(data: dict) -> str:
    canon = {"customer": data["customer"], "delivery": data["delivery"],
             "lines": [{"slug": l["slug"], "config": dict(l["config"]), "qty": l["qty"]} for l in data["lines"]]}
    return hashlib.sha256(json.dumps(canon, sort_keys=True, default=str).encode()).hexdigest()


def place_order(data: dict, code: str | None) -> Placed:
    digest = payload_hash(data)
    if code:
        existing = Order.objects.prefetch_related("lines").filter(code=code).first()
        if existing:
            return _replay(existing, digest)

    q = quote(data["lines"], data["delivery"])
    if abs(q["total"] - data["total"]) > PRICE_TOLERANCE:
        raise ApiError(
            "price-changed",
            "Gold moved since this page priced your bag. Review the new total and place the order again.",
            409,
            spot=q["spot"],
            quote={"lines": [{"slug": l["slug"], "unit": l["unit"]} for l in q["lines"]],
                   "subtotal": q["subtotal"], "shipping": q["shipping"], "total": q["total"]},
        )

    c = data["customer"]
    try:
        with transaction.atomic():
            order = Order.objects.create(
                code=code or new_code(),
                **{k: c[k] for k in ("name", "email", "phone", "address", "city", "postal", "country", "notes")},
                delivery=data["delivery"],
                spot_per_gram=round(q["spot"]["perGram"], 2),
                spot_as_of=q["spot"]["asOf"],
                subtotal=q["subtotal"],
                shipping=q["shipping"],
                total=q["total"],
                payload_hash=digest,
            )
            OrderLine.objects.bulk_create(OrderLine(order=order, position=i, **l) for i, l in enumerate(q["lines"]))
    except IntegrityError:
        # Two retries of the same order raced; the loser returns the winner's row.
        existing = Order.objects.prefetch_related("lines").filter(code=code).first()
        if existing is None:
            raise
        return _replay(existing, digest)

    transaction.on_commit(lambda: _announce(order, len(q["lines"])))
    order = Order.objects.prefetch_related("lines").get(pk=order.pk)
    return Placed(order, True)


def _replay(existing: Order, digest: str) -> Placed:
    if existing.payload_hash != digest:
        raise ApiError("code-in-use", "This order code belongs to a different order. Reload the checkout.", 409)
    return Placed(existing, False)


def _announce(order: Order, line_count: int):
    from monitoring.events import emit

    emit("orders", {"type": "order.created", "code": order.code, "total": order.total,
                    "lineCount": line_count, "delivery": order.delivery})
