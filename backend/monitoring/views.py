from datetime import timedelta

from django.db.models import Count, Max, Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from solenne.permissions import IsOwner

from .models import MetricBucket, OrderEvent


class StatsView(APIView):
    """Last N minutes (default 60) of traffic and sales as seen through Kafka."""

    permission_classes = [IsOwner]

    def get(self, request):
        try:
            minutes = min(max(int(request.query_params.get("minutes", 60)), 5), 1440)
        except ValueError:
            minutes = 60
        since = timezone.now() - timedelta(minutes=minutes)
        buckets = MetricBucket.objects.filter(minute__gte=since)
        totals = buckets.aggregate(requests=Sum("count"), errors=Sum("errors"), clientErrors=Sum("client_errors"),
                                   totalMs=Sum("total_ms"), maxMs=Max("max_ms"))
        n = totals["requests"] or 0
        routes = (
            buckets.values("method", "route")
            .annotate(requests=Sum("count"), errors=Sum("errors"), totalMs=Sum("total_ms"), maxMs=Max("max_ms"))
            .order_by("-requests")[:10]
        )
        timeline = buckets.values("minute").annotate(requests=Sum("count"), errors=Sum("errors")).order_by("minute")
        orders = OrderEvent.objects.filter(ts__gte=since, type="order.created").aggregate(
            count=Count("id"), revenue=Sum("total"))
        return Response({
            "windowMinutes": minutes,
            "requests": n,
            "perMinute": round(n / minutes, 2),
            "errorRate": round((totals["errors"] or 0) / n, 4) if n else 0,
            "clientErrorRate": round((totals["clientErrors"] or 0) / n, 4) if n else 0,
            "avgMs": round(totals["totalMs"] / n, 1) if n else 0,
            "maxMs": round(totals["maxMs"] or 0, 1),
            "orders": orders["count"],
            "revenue": orders["revenue"] or 0,
            "routes": [{"method": r["method"], "route": r["route"], "requests": r["requests"], "errors": r["errors"],
                        "avgMs": round(r["totalMs"] / r["requests"], 1), "maxMs": round(r["maxMs"], 1)} for r in routes],
            "timeline": [{"minute": t["minute"].isoformat(), "requests": t["requests"], "errors": t["errors"]}
                         for t in timeline],
        })
