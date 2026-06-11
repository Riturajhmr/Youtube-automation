from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar
from datetime import datetime, timezone

# Per-request ID injected by RequestIDMiddleware and read by _JsonFormatter.
# Defined here (a leaf module) so middleware can import it without circular deps.
_request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="-")


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            # Use record.created (Unix timestamp of the logging call) not wall clock.
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": _request_id_ctx_var.get(),
        }
        if record.exc_info:
            log_entry["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def _build_formatter(debug: bool) -> logging.Formatter:
    if debug:
        return logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    return _JsonFormatter()


def setup_logging(level: str) -> None:
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    formatter = _build_formatter(debug=level.upper() == "DEBUG")

    if root_logger.handlers:
        # Replace formatters on uvicorn's existing handlers rather than removing them.
        # Clearing handlers would break uvicorn's access log output.
        for handler in root_logger.handlers:
            handler.setLevel(numeric_level)
            handler.setFormatter(formatter)
    else:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(numeric_level)
        handler.setFormatter(formatter)
        root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
