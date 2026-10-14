from rest_framework import generics, status
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from solenne.errors import ApiError
from solenne.permissions import IsOwner

from .models import Order
from .serializers import CODE_RE, OrderIn, OrderOut, StatusIn
from .services import place_order


class OrderCursor(CursorPagination):
    # Stable under inserts (new orders arrive while the owner pages) and O(1) per page, unlike OFFSET.
    ordering = ("-created_at", "-id")
    page_size = 50
    max_page_size = 200
    page_size_query_param = "limit"


class OrderListCreate(generics.ListAPIView):
    serializer_class = OrderOut
    pagination_class = OrderCursor
    throttle_scope = "orders"

    def get_permissions(self):
        return [] if self.request.method == "POST" else [IsOwner()]

    def get_throttles(self):
        # Public order placement is the expensive, abusable call: it gets its own per-IP bucket.
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def get_queryset(self):
        qs = Order.objects.prefetch_related("lines")
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st in Order.Status.values else qs

    def post(self, request):
        key = request.headers.get("Idempotency-Key") or None
        if key is not None and not CODE_RE.match(key):
            raise ApiError("invalid-key", "Idempotency-Key must be an order code like SLN-AB12CD.", 400)
        data = OrderIn(data=request.data)
        data.is_valid(raise_exception=True)
        placed = place_order(data.validated_data, key)
        return Response(OrderOut(placed.order).data, status=status.HTTP_201_CREATED if placed.created else status.HTTP_200_OK)


class OrderDetail(APIView):
    permission_classes = [IsOwner]

    def _get(self, code):
        order = Order.objects.prefetch_related("lines").filter(code=code).first()
        if order is None:
            raise ApiError("not_found", f"No order {code}.", 404)
        return order

    def get(self, request, code):
        return Response(OrderOut(self._get(code)).data)

    def patch(self, request, code):
        order = self._get(code)
        s = StatusIn(data=request.data)
        s.is_valid(raise_exception=True)
        new = s.validated_data["status"]
        if new != order.status and new not in Order.TRANSITIONS[order.status]:
            raise ApiError("bad-transition", f"An order that is {order.status} can't become {new}.", 409)
        order.status = new
        order.save(update_fields=["status"])
        return Response(OrderOut(order).data)
