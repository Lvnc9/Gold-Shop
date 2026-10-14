from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from catalog.views import SpotView
from monitoring.views import StatsView
from orders.views import OrderDetail, OrderListCreate

from .auth import LogoutView, MeView, RefreshView, TokenView
from .health import HealthView

api = [
    path("health/", HealthView.as_view()),
    path("spot/", SpotView.as_view()),
    path("orders/", OrderListCreate.as_view()),
    path("orders/<str:code>/", OrderDetail.as_view()),
    path("auth/token/", TokenView.as_view()),
    path("auth/refresh/", RefreshView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("auth/me/", MeView.as_view()),
    path("monitor/stats/", StatsView.as_view()),
]

urlpatterns = [
    path("api/v1/", include(api)),
    path("admin/", admin.site.urls),
]

admin.site.site_header = "Solenne atelier"
admin.site.site_title = "Solenne"


def handler404(request, exception=None):
    return JsonResponse({"error": "not_found", "detail": "No such endpoint."}, status=404)


def handler500(request):
    return JsonResponse({"error": "server", "detail": "Something broke on our side. Try again."}, status=500)
