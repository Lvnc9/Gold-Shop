from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="MetricBucket",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("minute", models.DateTimeField()),
                ("method", models.CharField(max_length=8)),
                ("route", models.CharField(max_length=120)),
                ("count", models.PositiveIntegerField(default=0)),
                ("errors", models.PositiveIntegerField(default=0)),
                ("client_errors", models.PositiveIntegerField(default=0)),
                ("total_ms", models.FloatField(default=0)),
                ("max_ms", models.FloatField(default=0)),
            ],
            options={
                "indexes": [models.Index(fields=["-minute"], name="bucket_recent")],
                "constraints": [models.UniqueConstraint(fields=("minute", "method", "route"), name="bucket_key")],
            },
        ),
        migrations.CreateModel(
            name="OrderEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ts", models.DateTimeField(db_index=True)),
                ("type", models.CharField(max_length=32)),
                ("code", models.CharField(blank=True, max_length=10)),
                ("total", models.PositiveIntegerField(null=True)),
                ("payload", models.JSONField()),
            ],
        ),
    ]
