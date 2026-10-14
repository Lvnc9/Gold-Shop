"""Wire format = the TypeScript OrderRecord in src/services/orders.ts (camelCase)."""

import re

from rest_framework import serializers

from .models import Order

CODE_RE = re.compile(r"^SLN-[A-HJ-NP-Z2-9]{6}$")


class ConfigIn(serializers.Serializer):
    color = serializers.ChoiceField(["yellow", "rose", "white"])
    karat = serializers.ChoiceField([24, 22, 18, 14])
    variant = serializers.IntegerField(min_value=0, max_value=20)
    size = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=8)
    finish = serializers.ChoiceField(["polished", "satin", "hammered"])
    engraving = serializers.CharField(required=False, allow_blank=True, default="", max_length=40, trim_whitespace=False)


class LineIn(serializers.Serializer):
    slug = serializers.SlugField(max_length=64)
    config = ConfigIn()
    qty = serializers.IntegerField(min_value=1, max_value=9)


class CustomerIn(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=120)
    email = serializers.EmailField(max_length=200)
    phone = serializers.CharField(max_length=40)
    address = serializers.CharField(min_length=4, max_length=200)
    city = serializers.CharField(max_length=100)
    postal = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=60)
    notes = serializers.CharField(required=False, allow_blank=True, default="", max_length=1000)

    def validate_phone(self, v):
        if len(re.sub(r"\D", "", v)) < 7:
            raise serializers.ValidationError("Enter a phone number the courier can call.")
        return v


class OrderIn(serializers.Serializer):
    customer = CustomerIn()
    delivery = serializers.ChoiceField(Order.Delivery.choices)
    lines = LineIn(many=True, min_length=1, max_length=20)
    # What the customer saw; the server re-prices and refuses a stale total.
    total = serializers.IntegerField(min_value=0)


class OrderOut(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at")
    customer = serializers.SerializerMethodField()
    lines = serializers.SerializerMethodField()
    spotPerGram = serializers.FloatField(source="spot_per_gram")
    spotAsOf = serializers.DateField(source="spot_as_of")

    class Meta:
        model = Order
        fields = ["code", "createdAt", "status", "customer", "delivery", "lines",
                  "spotPerGram", "spotAsOf", "subtotal", "shipping", "total"]

    def get_customer(self, o):
        return {k: getattr(o, k) for k in ("name", "email", "phone", "address", "city", "postal", "country", "notes")}

    def get_lines(self, o):
        # Uses the prefetched cache: no query per order in list views.
        return [{"slug": l.slug, "name": l.name, "summary": l.summary, "qty": l.qty, "unit": l.unit, "config": l.config}
                for l in o.lines.all()]


class StatusIn(serializers.Serializer):
    status = serializers.ChoiceField(Order.Status.choices)
