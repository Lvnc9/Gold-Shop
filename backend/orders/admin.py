from django.contrib import admin

from .models import Order, OrderLine


class LineInline(admin.TabularInline):
    model = OrderLine
    extra = 0
    readonly_fields = ("position", "slug", "name", "summary", "qty", "unit", "config")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("code", "created_at", "name", "email", "total", "delivery", "status")
    list_filter = ("status", "delivery", "created_at")
    search_fields = ("code", "name", "email")
    readonly_fields = ("code", "created_at", "spot_per_gram", "spot_as_of", "subtotal", "shipping", "total", "payload_hash")
    inlines = [LineInline]
    date_hierarchy = "created_at"
