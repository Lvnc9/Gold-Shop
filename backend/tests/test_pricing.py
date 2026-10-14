import json
from pathlib import Path

import pytest

from catalog import pricing

FIX = Path(__file__).resolve().parents[1] / "catalog" / "fixtures"
CATALOG = {p["slug"]: p for p in json.loads((FIX / "catalog.json").read_text())}
GOLDEN = json.loads((FIX / "price_golden.json").read_text())


@pytest.mark.parametrize("case", GOLDEN["cases"], ids=lambda c: f"{c['slug']}-{c['config']['karat']}k-v{c['config']['variant']}-{c['config'].get('size')}-{bool(c['config']['engraving'])}")
def test_matches_browser(case):
    product = CATALOG[case["slug"]]
    assert pricing.price(product, case["config"], GOLDEN["spot"]) == case["total"]
    assert pricing.config_summary(product, case["config"]) == case["summary"]


def test_js_round_half_up():
    assert pricing.js_round(2.5) == 3 and pricing.js_round(3.5) == 4 and pricing.js_round(-0.5) == 0


def test_shipping_rules():
    assert pricing.shipping(499, "insured") == 25
    assert pricing.shipping(500, "insured") == 0
    assert pricing.shipping(10_000, "express") == 45
