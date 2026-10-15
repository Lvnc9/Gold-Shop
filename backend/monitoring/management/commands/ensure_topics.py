from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the Solenne Kafka topics if missing, so the monitor subscribes to real topics from its first poll."

    def handle(self, *args, **opts):
        if not settings.KAFKA["enabled"]:
            self.stdout.write("Kafka disabled; skipping topics")
            return
        from confluent_kafka.admin import AdminClient, NewTopic

        admin = AdminClient({"bootstrap.servers": settings.KAFKA["bootstrap"]})
        existing = set(admin.list_topics(timeout=10).topics)
        wanted = [NewTopic(t, num_partitions=3, replication_factor=1, config={"retention.ms": str(72 * 3600 * 1000)})
                  for t in settings.KAFKA["topics"].values() if t not in existing]
        # create_topics() rejects an empty list; on every run after the first, nothing is missing.
        for topic, fut in (admin.create_topics(wanted) if wanted else {}).items():
            fut.result()
            self.stdout.write(f"created topic {topic}")
        self.stdout.write(f"topics ready: {', '.join(settings.KAFKA['topics'].values())}")
