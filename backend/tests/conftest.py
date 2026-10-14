import pytest
from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient

from monitoring import events


@pytest.fixture(autouse=True)
def _clean(db):
    cache.clear()
    events.sent.clear()
    call_command("seed_catalog", verbosity=0)


@pytest.fixture
def client():
    return APIClient(REMOTE_ADDR="10.0.0.1")


@pytest.fixture
def owner(django_user_model):
    return django_user_model.objects.create_user("owner@solenne.test", "owner@solenne.test", "a-long-test-password",
                                                 is_staff=True, is_superuser=True)


@pytest.fixture
def owner_client(owner):
    from rest_framework_simplejwt.tokens import RefreshToken

    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(owner).access_token}")
    return c
