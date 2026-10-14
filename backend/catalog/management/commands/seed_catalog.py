import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import Product

FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "catalog.json"


class Command(BaseCommand):
    help = "Load the catalogue exported from src/domain (npm run export:catalog). Idempotent."

    def handle(self, *args, **opts):
        entries = json.loads(FIXTURE.read_text())
        with transaction.atomic():
            for e in entries:
                Product.objects.update_or_create(
                    slug=e["slug"], defaults={"name": e["name"], "category": e["category"], "data": e}
                )
            stale = Product.objects.exclude(slug__in=[e["slug"] for e in entries]).delete()[0]
        self.stdout.write(f"catalogue: {len(entries)} products, {stale} removed")
