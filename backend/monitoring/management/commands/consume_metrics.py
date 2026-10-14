import json
import logging
import signal

from django.conf import settings
from django.core.management.base import BaseCommand

from monitoring.consumer import apply

log = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Consume Solenne Kafka topics and roll them up for /api/v1/monitor/stats/."

    def handle(self, *args, **opts):
        from confluent_kafka import Consumer, KafkaException

        topics = settings.KAFKA["topics"]
        kind_of = {v: k for k, v in topics.items()}
        consumer = Consumer({
            "bootstrap.servers": settings.KAFKA["bootstrap"],
            "group.id": "solenne-monitor",
            "auto.offset.reset": "earliest",
            "enable.auto.commit": False,  # commit only after the rollup is in the DB: at-least-once
        })
        consumer.subscribe(list(topics.values()))
        running = True

        def stop(*_):
            nonlocal running
            running = False

        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        log.info("monitor consuming %s", ", ".join(topics.values()))
        try:
            while running:
                msgs = consumer.consume(num_messages=500, timeout=1.0)
                batch = []
                for m in msgs:
                    if m.error():
                        if m.error().fatal():
                            raise KafkaException(m.error())
                        continue
                    try:
                        batch.append((kind_of.get(m.topic(), m.topic()), json.loads(m.value())))
                    except (ValueError, TypeError):
                        log.warning("skipping malformed event on %s", m.topic())
                if batch:
                    apply(batch)
                    consumer.commit(asynchronous=False)
                    log.info("rolled up %d events", len(batch))
        finally:
            consumer.close()
