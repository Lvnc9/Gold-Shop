import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=10, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("status", models.CharField(choices=[("received", "Received"), ("confirmed", "Confirmed"),
                                                     ("shipped", "Shipped"), ("cancelled", "Cancelled")],
                                            default="received", max_length=10)),
                ("name", models.CharField(max_length=120)),
                ("email", models.EmailField(max_length=200)),
                ("phone", models.CharField(max_length=40)),
                ("address", models.CharField(max_length=200)),
                ("city", models.CharField(max_length=100)),
                ("postal", models.CharField(max_length=20)),
                ("country", models.CharField(max_length=60)),
                ("notes", models.TextField(blank=True, max_length=1000)),
                ("delivery", models.CharField(choices=[("insured", "Insured"), ("express", "Express")], max_length=8)),
                ("spot_per_gram", models.DecimalField(decimal_places=2, max_digits=8)),
                ("spot_as_of", models.DateField()),
                ("subtotal", models.PositiveIntegerField()),
                ("shipping", models.PositiveIntegerField()),
                ("total", models.PositiveIntegerField()),
                ("payload_hash", models.CharField(max_length=64)),
            ],
            options={
                "ordering": ["-created_at", "-id"],
                "indexes": [
                    models.Index(fields=["-created_at", "-id"], name="order_recent"),
                    models.Index(fields=["status", "-created_at"], name="order_status_recent"),
                ],
            },
        ),
        migrations.CreateModel(
            name="OrderLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("position", models.PositiveSmallIntegerField()),
                ("slug", models.SlugField(max_length=64)),
                ("name", models.CharField(max_length=120)),
                ("summary", models.CharField(max_length=300)),
                ("qty", models.PositiveSmallIntegerField()),
                ("unit", models.PositiveIntegerField()),
                ("config", models.JSONField()),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines",
                                            to="orders.order")),
            ],
            options={
                "ordering": ["order", "position"],
                "constraints": [models.UniqueConstraint(fields=("order", "position"), name="orderline_position")],
            },
        ),
    ]
