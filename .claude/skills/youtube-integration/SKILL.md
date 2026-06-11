---
name: youtube-integration
description: Defines TubeFlow's YouTube integration architecture — OAuth, channel connection, upload, publishing, scheduling, quota management, and security. Apply when building or reviewing any YouTube-facing feature, API client, or workflow.
---

## YouTube API Overview

TubeFlow uses YouTube Data API v3. Key scopes: `youtube.upload` (upload), `youtube.readonly` (read data), `youtube` (full management — required for metadata + scheduling), `youtube.force-ssl` (enforce HTTPS).

All calls are scoped to individual creator credentials — never a shared API key for publishing.

---

## Credential Types

| Type | Purpose | Where stored |
|---|---|---|
| API Key | Read-only public data (channel stats, search) | Server env var only |
| OAuth Client ID/Secret | Identify TubeFlow as a registered app | Server env var only |
| Access Token | Short-lived user session token (1 hour) | Encrypted in DB, never logged |
| Refresh Token | Long-lived token to get new access tokens | Encrypted in DB, never exposed to frontend |

**Rules:** Never store tokens in source code or version control. Never expose refresh tokens to the frontend. Rotate client secrets on suspected exposure. Always refresh access tokens silently before API calls.

---

## Channel Connection Flow

```
Creator clicks "Connect YouTube Channel"
  → TubeFlow initiates OAuth 2.0 authorization request
  → Creator redirected to Google consent screen (requested scopes shown)
  → Creator approves
  → Google redirects to TubeFlow callback URL with authorization code
  → TubeFlow backend exchanges code for access + refresh tokens
  → TubeFlow fetches channel metadata (id, name, thumbnail)
  → Tokens encrypted and stored against creator's account
  → Channel record created; creator redirected to dashboard
```

One TubeFlow account supports multiple channels; each has its own isolated token set.

---

## Upload Flow

```
Creator selects video file
  → TubeFlow validates file (format, size, duration limits)
  → Upload request initiated with resumable upload session (YouTube resumable upload API)
  → File uploaded in chunks — supports pause/resume on failure
  → YouTube returns video ID on completion (status: "processing")
  → TubeFlow stores video ID and polls for processing status
  → Once processed, metadata can be applied
```

Always use resumable uploads for files over 5MB. Store the resumable upload URI so interrupted uploads can be resumed without re-uploading.

---

## Metadata Update Workflow

After upload, apply generated metadata via a `videos.update` call:
- `snippet.title` — max 100 characters
- `snippet.description` — max 5000 characters
- `snippet.tags` — max 500 characters total across all tags
- `snippet.categoryId` — must be a valid YouTube category ID
- `status.privacyStatus` — `private`, `unlisted`, or `public`

Metadata can be updated independently of upload, allowing refinement while video is processing. Requires the `youtube` scope.

---

## Publishing Flow

```
Creator reviews and approves metadata
  → TubeFlow calls videos.update with title, description, tags
  → Privacy status set to "public" (or "unlisted" for review)
  → TubeFlow confirms publish status via videos.list
  → Creator dashboard updated with live video URL
```

Never change privacy to `public` without explicit creator confirmation.

---

## Scheduling Flow

YouTube supports scheduled publishing via `status.publishAt` (ISO 8601 UTC). Video must be `private` to schedule; YouTube publishes automatically at the set time.

```
Creator sets publish date/time
  → TubeFlow sets privacyStatus = "private", publishAt = "<datetime>"
  → TubeFlow polls videos.list to confirm scheduled status
  → YouTube publishes automatically at publish time
```

Scheduling costs only the `videos.update` quota (50 units).

---

## Quota Management

YouTube Data API v3 quota is 10,000 units/day per project by default.

| Operation | Quota cost |
|---|---|
| `videos.insert` (upload) | 1,600 units |
| `videos.update` | 50 units |
| `videos.list` | 1 unit |
| `channels.list` | 1 unit |

**Rules:** Monitor daily consumption. Use `videos.list` for polling (1 unit). Apply for quota increase before launch. Rate-limit per creator to prevent single-user exhaustion.

---

## Error Handling

| Error | Cause | Response |
|---|---|---|
| `401 Unauthorized` | Expired or invalid access token | Refresh token silently; retry once |
| `403 quotaExceeded` | Daily quota exhausted | Queue operation for next quota window; notify creator |
| `403 forbidden` | Insufficient OAuth scope | Prompt creator to reconnect with correct scopes |
| `400 invalidVideoId` | Video not yet processed | Retry with exponential backoff |
| `503 backendError` | YouTube transient failure | Retry with exponential backoff (max 3 attempts) |

Never surface raw API errors to creators — map to user-friendly messages and log full context server-side.

---

## Security Best Practices

- Tokens encrypted at rest (AES-256); encryption keys in a secrets manager, not env vars
- OAuth callback URL allowlisted in Google Cloud Console — no wildcards
- Validate `state` parameter on OAuth callback to prevent CSRF
- Revoke tokens immediately on disconnect or account deletion
- Audit log all publish and upload actions; never log tokens or auth codes

---

## Common Failure Scenarios

| Scenario | Detection | Recovery |
|---|---|---|
| Refresh token revoked by creator | `401` on refresh attempt | Prompt reconnect; mark channel as disconnected |
| Upload interrupted mid-transfer | No video ID returned | Resume from stored resumable URI |
| Quota exhausted mid-day | `403 quotaExceeded` | Queue remaining jobs; alert ops; notify creator |
| Video stuck in processing | Status never leaves "processing" | Alert after 2 hours; link to YouTube Studio |
| Scheduled publish not firing | `publishAt` silently failed | Poll at scheduled time + 5 min; re-trigger if needed |
