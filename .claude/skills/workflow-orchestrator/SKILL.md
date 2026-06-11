---
name: workflow-orchestrator
description: Defines how TubeFlow workflows are designed, executed, and recovered. Apply when building, reviewing, or extending any multi-step workflow — upload, metadata generation, publishing, or scheduling.
---

## What Is a Workflow

A workflow is a named, ordered sequence of discrete steps that transforms content from input to a published outcome. Each step has a single responsibility, a defined input, and a defined output. Steps do not call each other — the orchestrator sequences them.

**Reference workflow (upload → publish):**
```
Upload Video
  → Analyze Content
  → Generate Metadata     ← references [[metadata-engine]]
  → Human Review
  → Publish to YouTube    ← references [[youtube-integration]]
```

---

## Design Principles

- **Modular** — each step is a standalone unit; swappable without affecting others
- **Composable** — workflows are assembled from steps, not hardcoded sequences
- **Reusable** — common steps (content analysis, validation) used across workflows
- **Observable** — every state transition and failure is logged with context
- **Fault tolerant** — transient failures retry automatically; hard failures halt and preserve state

---

## Workflow Lifecycle

```
CREATED → QUEUED → RUNNING → [step-by-step execution] → COMPLETED
                                     ↓ on failure
                               RETRYING → RUNNING
                                     ↓ retry limit reached
                                  FAILED
                                     ↓ creator action
                                 CANCELLED
```

Additional states:
- `AWAITING_REVIEW` — workflow paused at a human review checkpoint
- `PAUSED` — manually paused by the creator
- `SKIPPED` — step intentionally bypassed (e.g., metadata already provided)

---

## Workflow States

| State | Meaning |
|---|---|
| `CREATED` | Workflow record initialized; not yet queued |
| `QUEUED` | Awaiting a worker to pick it up |
| `RUNNING` | Actively executing a step |
| `AWAITING_REVIEW` | Paused at a human review point |
| `PAUSED` | Creator or system pause; can be resumed |
| `RETRYING` | Step failed; waiting for retry attempt |
| `COMPLETED` | All steps finished successfully |
| `FAILED` | Step exhausted retries; requires intervention |
| `CANCELLED` | Terminated by creator action |

State transitions are append-only — never mutate history. Store `(state, timestamp, step, reason)` per transition.

---

## Step Design

Each step must define:
- `name` — unique identifier within the workflow
- `input_schema` — what it expects from the previous step or workflow context
- `output_schema` — what it passes to the next step
- `is_blocking` — whether failure halts the workflow (true) or is skippable (false)
- `requires_review` — whether a human must approve before execution continues
- `retry_policy` — max attempts, backoff strategy, retryable error types

Steps must be idempotent — re-running a step with the same input must produce the same result without side effects.

---

## Retry and Failure Recovery

**Retry policy per step:**
- Max attempts: 3 (default); configurable per step
- Backoff: exponential with jitter (1s, 4s, 16s)
- Retryable: transient errors (network timeout, `503`, quota exceeded)
- Non-retryable: validation failures, auth errors, missing required input

**On retry exhaustion:**
- Set workflow state to `FAILED`
- Record the failed step, error type, and last error message
- Preserve all prior step outputs — do not discard completed work
- Notify creator with the failed step name and a plain-language reason
- Allow manual resume from the failed step (not from the beginning)

**On partial completion:**
- Steps completed before failure are not re-run on resume
- Resume picks up from the last failed or incomplete step

---

## Human Review Points

Steps with `requires_review = true` pause the workflow at `AWAITING_REVIEW`. The creator must explicitly approve or reject before execution continues.

Default review points in TubeFlow:
- After metadata generation — creator reviews and edits title, description, tags
- Before publishing — creator confirms final metadata and publish settings

**Rules:**
- Review timeout does not auto-approve — workflow stays paused indefinitely
- Creator can edit step output during review (e.g., modify generated metadata)
- Rejection sends the workflow back to the preceding step with creator notes

---

## Workflow Logging

Every workflow must emit structured log entries for:
- Workflow created (with input summary)
- Each step started, completed, or failed (with duration)
- Each retry attempt (with error and attempt number)
- State transitions (with timestamp and trigger)
- Review actions (approved / rejected / edited)

Log entries always include: `workflow_id`, `step_name`, `state`, `timestamp`, `creator_id`. Never log video content, metadata text, or tokens.

---

## Workflow Validation Checklist

**Design time:**
- [ ] Every step has a defined input and output schema
- [ ] All steps are idempotent
- [ ] Retry policy defined for every non-trivial step
- [ ] Human review points explicitly declared
- [ ] Workflow can resume from any step without re-running completed steps

**Runtime:**
- [ ] Every state transition is logged with timestamp and reason
- [ ] Failures preserve all prior step outputs
- [ ] Creator is notified on workflow failure with plain-language context
- [ ] Review points enforce explicit approval — no auto-continuation on timeout
- [ ] Workflow ID attached to all log entries and error reports
