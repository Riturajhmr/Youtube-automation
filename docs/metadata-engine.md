# Metadata Engine

## Purpose

The Metadata Engine is the core component of TubeFlow.

Its responsibility is to generate professional-grade YouTube metadata that helps creators publish videos faster while maintaining high quality standards.

TubeFlow's primary competitive advantage is metadata quality, not publishing automation.

---

## Goals

Generate:

* SEO-aware titles
* Professional descriptions
* Relevant tags

Output should be:

* Human-like
* Audience-aware
* Niche-aware
* Publish-ready

---

## Inputs

### Required

* Transcript

### Optional

* Title Hint
* Target Keywords
* Thumbnail
* Video Frames
* Channel Profile
* Audience Profile
* Video Context

The engine must function even when optional inputs are unavailable.

---

## Generation Pipeline

Input
↓
Content Analysis
↓
Audience Detection
↓
Niche Detection
↓
Keyword Extraction
↓
Metadata Generation
↓
Metadata Validation
↓
Final Output

Each stage should remain modular and replaceable.

---

## Content Analysis

Identify:

* Main topic
* Subtopics
* Viewer value
* Key concepts
* Search intent

The engine should understand meaning rather than simply counting keywords.

---

## Audience Detection

Determine:

* Target audience
* Experience level
* Viewer goals
* Expected outcome

Metadata should match the intended audience.

---

## Niche Detection

Support multiple niches including:

* Programming
* Education
* Finance
* Business
* Gaming
* Fitness
* Technology
* Lifestyle

Metadata style should adapt to the niche.

---

## Keyword Extraction

Sources:

* Transcript
* Target Keywords
* Channel Profile
* Video Context

Prioritize relevance over keyword volume.

Avoid keyword stuffing.

---

## Title Generation

Titles should:

* Clearly communicate value
* Match viewer intent
* Encourage clicks
* Remain truthful

Avoid:

* Clickbait
* Misleading claims
* Generic wording

---

## Description Generation

Descriptions should:

* Explain the video's value
* Improve discoverability
* Include keywords naturally
* Remain readable

Write for humans first and search engines second.

---

## Tag Generation

Tags should be:

* Relevant
* Topic-specific
* Niche-aware

Avoid irrelevant or spam-like tags.

Quality is more important than quantity.

---

## Channel Profile Influence

Metadata should consider:

* Niche
* Audience
* Brand voice
* Preferred tone
* Geographic focus

Two channels covering the same topic may require different metadata.

---

## Validation

Before returning metadata:

### Title

* Relevant
* Clear
* Non-misleading

### Description

* Readable
* Professional
* Context-rich

### Tags

* Relevant
* Non-spammy
* Discoverability-focused

---

## Output Format

```json
{
  "title": "string",
  "description": "string",
  "tags": ["string"]
}
```

---

## Source of Truth

Metadata quality standards are defined in:

* metadata-quality-standard

This document defines how metadata is generated.

The quality standard defines how good metadata should be.

---

## Success Criteria

The engine succeeds when a creator can provide a transcript and receive metadata that:

* Requires minimal editing
* Feels professionally written
* Matches the audience
* Matches the niche
* Is ready for publishing
