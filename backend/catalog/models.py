from django.conf import settings
from django.db import models


class Product(models.Model):
    """Read-only mirror of src/domain/products.ts, loaded by `manage.py seed_catalog`.

    The full exported entry lives in `data` so pricing reads exactly what the browser reads.
    """

    slug = models.SlugField(primary_key=True, max_length=64)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=32, db_index=True)
    data = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "slug"]

    def __str__(self):
        return self.name


class SpotPrice(models.Model):
    """24k spot in USD per gram. Append-only history; the newest row is the live price."""

    per_gram = models.DecimalField(max_digits=8, decimal_places=2)
    as_of = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at", "-id"]
        get_latest_by = "created_at"

    def __str__(self):
        return f"${self.per_gram}/g ({self.as_of})"
