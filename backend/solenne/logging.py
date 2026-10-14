import json
import logging
from datetime import UTC, datetime

from .middleware import INSTANCE


class JsonFormatter(logging.Formatter):
    """One JSON object per line, same keys as the nginx access log where they overlap."""

    def format(self, record):
        entry = {
            "time": datetime.fromtimestamp(record.created, UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "instance": INSTANCE,
            "message": record.getMessage(),
        }
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False)
