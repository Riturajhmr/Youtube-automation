---
name: backend-engineering
description: Defines TubeFlow's backend development standards — architecture, API design, services, repositories, error handling, and security. Apply when writing, reviewing, or scaffolding any backend code.
---

## Stack

Python · FastAPI · PostgreSQL · SQLAlchemy 2.0 · Pydantic v2

---

## Architecture

```
api/v1/endpoints/   → thin route handlers only; no business logic
services/           → all business logic; one service per domain
repositories/       → all database access; no raw SQL in services
models/             → SQLAlchemy ORM models
schemas/            → Pydantic request/response models
core/               → database, security, config, exceptions, logging
middleware/         → auth, CORS, rate limiting, request logging
workers/            → background tasks (Celery)
integrations/       → external APIs (YouTube, storage)
```

**Separation rules:**
Routes → Services → Repositories → DB. No DB access in routes or services directly. No business logic in repositories. Integrations wrapped in service methods only.

---

## API Design

- Versioned routers (`/api/v1/`); plural noun routes in kebab-case (`/publish-jobs`)
- HTTP verbs: `GET` read · `POST` create · `PUT` replace · `PATCH` partial · `DELETE` remove
- Request bodies via Pydantic schemas only; response schemas always explicit — no raw ORM models
- Consistent error shape: `{ "error": "...", "detail": "...", "code": "..." }`
- Pagination on all list endpoints: `limit` + `offset` or cursor-based

---

## Service Layer

- One class per domain (`VideoService`, `MetadataService`, `PublishService`)
- Dependencies injected via constructor; all methods `async`
- Raise domain exceptions, not `HTTPException`
- Only layer that calls integrations; no direct session usage — delegate to repositories

---

## Repository Pattern

- One repository per model; all methods `async` with injected `AsyncSession`
- Typed parameters and return types throughout
- Pure read/write only — no business logic
- Use `select()`, `update()`, `delete()`; avoid legacy `Query` API

---

## Dependency Injection

- Use `Depends()` for sessions, current user, and service instances
- Define all reusable dependencies in `app/dependencies.py`
- Session lifecycle managed per-request via `AsyncSession` context

---

## Error Handling

- Domain exceptions defined in `core/exceptions.py`; global handlers in `app/main.py`
- 4xx: client errors. 5xx: server errors — log with full traceback, never expose internals
- Use structured error codes alongside HTTP status for frontend mapping

---

## Validation

- All input validated by Pydantic v2 schemas before reaching the service
- Use `model_validator`/`field_validator` for cross-field rules; business rules stay in services
- ORM models use `model_config = ConfigDict(from_attributes=True)`

---

## Async Programming

- All handlers, services, and repositories are `async def`; `await` all I/O
- No blocking calls in async context (`time.sleep`, sync `requests`)
- `asyncio.gather()` for concurrent independent operations
- Non-trivial background work goes to Celery — not FastAPI `BackgroundTasks`

---

## Logging

- Structured JSON logging in production; attach `request_id` to every entry
- Log at service boundaries: entry, key decisions, errors
- Never log passwords, tokens, PII, or raw request bodies
- Levels: `DEBUG` local · `INFO` production · `ERROR` with full traceback

---

## Security

- JWT validated in middleware, not per-route; passwords hashed with `bcrypt`
- All secrets from env vars — never hardcoded
- Row-level ownership enforced in services; creators access only their own resources
- Rate limiting in middleware; stricter on auth endpoints; no wildcard CORS in production

---

## Performance

- Explicit columns in list queries — no `SELECT *`; all lists paginated
- Index foreign keys and frequently filtered columns
- Cache expensive reads (channel stats, metadata previews) at service layer
- Use `httpx` async client for all outbound HTTP

---

## API Design Checklist
- [ ] Route is thin — no logic beyond calling a service method
- [ ] Request/response schemas defined in `schemas/`
- [ ] Endpoint versioned under `/api/v1/`
- [ ] List endpoints are paginated
- [ ] Errors return consistent shape with `error`, `detail`, `code`

## Service Design Checklist
- [ ] All methods `async`
- [ ] Dependencies injected via constructor
- [ ] Raises domain exceptions, not `HTTPException`
- [ ] No direct DB session access — delegates to repository
- [ ] No duplicated logic from other services

## Security Checklist
- [ ] Auth enforced via middleware dependency
- [ ] Resource ownership verified before any write
- [ ] No secrets in source code
- [ ] Inputs validated before service layer
- [ ] Tokens and PII excluded from logs

## Performance Checklist
- [ ] No `SELECT *` on list queries
- [ ] All list endpoints paginated
- [ ] Indexes on filter/join columns confirmed
- [ ] No blocking I/O in async context
- [ ] Expensive reads cached where appropriate
