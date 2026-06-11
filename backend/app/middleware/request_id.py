from __future__ import annotations

import uuid
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import _request_id_ctx_var


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Generates a UUID for every inbound request, stores it in:
    - request.state.request_id  (accessible in route handlers)
    - _request_id_ctx_var       (read by _JsonFormatter for structured logs)
    - X-Request-ID response header (returned to the caller for tracing)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        token = _request_id_ctx_var.set(request_id)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            _request_id_ctx_var.reset(token)
