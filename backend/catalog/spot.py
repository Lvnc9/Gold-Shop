"""The live spot price, cached because every page load and every order reads it."""

import hashlib

from django.conf import settings
from django.core.cache import cache

from .models import SpotPrice

CACHE_KEY = "spot:latest"


def current_spot() -> dict:
    spot = cache.get(CACHE_KEY)
    if spot is None:
        row = SpotPrice.objects.only("per_gram", "as_of").first()
        spot = {"perGram": float(row.per_gram), "asOf": row.as_of.isoformat()} if row else dict(settings.DEFAULT_SPOT)
        cache.set(CACHE_KEY, spot, timeout=300)
    return spot


def set_spot(per_gram, as_of, user=None) -> dict:
    SpotPrice.objects.create(per_gram=per_gram, as_of=as_of, created_by=user)
    cache.delete(CACHE_KEY)
    return current_spot()


def etag(spot: dict) -> str:
    return '"' + hashlib.sha1(f"{spot['perGram']:.2f}|{spot['asOf']}".encode()).hexdigest()[:16] + '"'
