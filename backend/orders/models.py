from django.db import models


class Order(models.Model):
    class Delivery(models.TextChoices):
        INSURED = "insured"
        EXPRESS = "express"

    class Status(models.TextChoices):
        RECEIVED = "received"
        CONFIRMED = "confirmed"
        SHIPPED = "shipped"
        CANCELLED = "cancelled"

    # Status machine for PATCH /orders/<code>/.
    TRANSITIONS = {
        "received": {"confirmed", "cancelled"},
        "confirmed": {"shipped", "cancelled"},
        "shipped": set(),
        "cancelled": set(),
    }

    code = models.CharField(max_length=10, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.RECEIVED)

    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=200)
    phone = models.CharField(max_length=40)
    address = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    postal = models.CharField(max_length=20)
    country = models.CharField(max_length=60)
    notes = models.TextField(blank=True, max_length=1000)

    delivery = models.CharField(max_length=8, choices=Delivery.choices)
    spot_per_gram = models.DecimalField(max_digits=8, decimal_places=2)
    spot_as_of = models.DateField()
    subtotal = models.PositiveIntegerField()
    shipping = models.PositiveIntegerField()
    total = models.PositiveIntegerField()
    # sha256 of the submitted lines/customer/delivery: a retried POST with the same Idempotency-Key must match.
    payload_hash = models.CharField(max_length=64)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["-created_at", "-id"], name="order_recent"),
            models.Index(fields=["status", "-created_at"], name="order_status_recent"),
        ]

    def __str__(self):
        return self.code


class OrderLine(models.Model):
    order = models.ForeignKey(Order, related_name="lines", on_delete=models.CASCADE)
    position = models.PositiveSmallIntegerField()
    slug = models.SlugField(max_length=64)
    name = models.CharField(max_length=120)
    summary = models.CharField(max_length=300)
    qty = models.PositiveSmallIntegerField()
    unit = models.PositiveIntegerField()
    config = models.JSONField()

    class Meta:
        ordering = ["order", "position"]
        constraints = [models.UniqueConstraint(fields=["order", "position"], name="orderline_position")]
