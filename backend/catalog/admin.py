from django.contrib import admin

from .models import Product, SpotPrice
from .spot import CACHE_KEY


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "category", "updated_at")
    list_filter = ("category",)
    readonly_fields = ("slug", "name", "category", "data", "updated_at")

    def has_add_permission(self, request):
        return False  # the catalogue comes from src/domain via seed_catalog


@admin.register(SpotPrice)
class SpotPriceAdmin(admin.ModelAdmin):
    list_display = ("per_gram", "as_of", "created_at", "created_by")
    readonly_fields = ("created_at", "created_by")

    def save_model(self, request, obj, form, change):
        obj.created_by = request.user
        super().save_model(request, obj, form, change)
        from django.core.cache import cache

        cache.delete(CACHE_KEY)
