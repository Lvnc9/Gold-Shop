from django.db import models


class MetricBucket(models.Model):
    """Per-minute rollup of solenne.http.requests, written by `manage.py consume_metrics`."""

    minute = models.DateTimeField()
    method = models.CharField(max_length=8)
    route = models.CharField(max_length=120)
    count = models.PositiveIntegerField(default=0)
    errors = models.PositiveIntegerField(default=0)  # 5xx
    client_errors = models.PositiveIntegerField(default=0)  # 4xx (incl. 429 from DRF)
    total_ms = models.FloatField(default=0)
    max_ms = models.FloatField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["minute", "method", "route"], name="bucket_key")]
        indexes = [models.Index(fields=["-minute"], name="bucket_recent")]


class OrderEvent(models.Model):
    """order.created / spot.updated events as consumed from Kafka (the monitor's own view, not the orders table)."""

    ts = models.DateTimeField(db_index=True)
    type = models.CharField(max_length=32)
    code = models.CharField(max_length=10, blank=True)
    total = models.PositiveIntegerField(null=True)
    payload = models.JSONField()
