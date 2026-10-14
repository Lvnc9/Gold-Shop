"""Python port of src/domain/pricing.ts and the shipping rules in src/state/app.ts.

Floats on purpose: the browser computes in IEEE doubles and rounds with Math.round, and the server must land on the
same whole dollar. tests/test_pricing.py checks every case in fixtures/price_golden.json.
"""

import math

PURITY = {24: 0.9999, 22: 0.916, 18: 0.75, 14: 0.585}
ENGRAVING_FEE = 35
FREE_SHIPPING_FROM = 500
EXPRESS_FEE = 45
INSURED_FEE = 25

COLOR_LABEL = {"yellow": "Yellow gold", "rose": "Rose gold", "white": "White gold"}
FINISH_LABEL = {"polished": "High polish", "satin": "Satin brushed", "hammered": "Hand hammered"}


def js_round(x: float) -> int:
    """Math.round: halves go up, unlike Python's round()."""
    return math.floor(x + 0.5)


def js_parse_float(s) -> float:
    try:
        return float(s)
    except (TypeError, ValueError):
        return math.nan


def size_factor(product: dict, size) -> float:
    s = product.get("sizes")
    if not s or not size:
        return 1.0
    cur, base = js_parse_float(size), js_parse_float(s["base"])
    if not (math.isfinite(cur) and math.isfinite(base)):
        return 1.0
    return 1 + (cur - base) * 0.03 if s["kind"] == "ring" else cur / base


def price(product: dict, config: dict, spot: float) -> int:
    variants = product["variants"]
    vi = config.get("variant", 0)
    variant = variants[vi] if 0 <= vi < len(variants) else variants[0]
    grams = variant["grams"] * size_factor(product, config.get("size"))
    metal = grams * PURITY[config["karat"]] * spot

    making = 0.0
    if product.get("premium") is not None:
        making = metal * product["premium"]
    elif product.get("making"):
        m = product["making"]
        making = metal * m["value"] if m["type"] == "pct" else m["value"]

    stones = product.get("stones") or 0
    engraving = ENGRAVING_FEE if (config.get("engraving") or "").strip() else 0
    return js_round(metal + making + stones + engraving)


def color_allowed(karat: int, color: str) -> bool:
    return karat != 24 or color == "yellow"


def config_summary(product: dict, config: dict) -> str:
    """Mirrors configSummary() in src/domain/format.ts plus the variant label CheckoutPage appends."""
    parts = [f"{config['karat']}k {COLOR_LABEL[config['color']].lower()}", FINISH_LABEL[config["finish"]].lower()]
    if config.get("size"):
        parts.append(f"size {config['size']}")
    engraving = (config.get("engraving") or "").strip()
    if engraving:
        parts.append(f"engraved “{engraving}”")
    return f"{' · '.join(parts)} · {product['variants'][config['variant']]['label']}"


def shipping(subtotal: int, delivery: str) -> int:
    if delivery == "express":
        return EXPRESS_FEE
    return 0 if subtotal >= FREE_SHIPPING_FROM or subtotal == 0 else INSURED_FEE
