---
name: metadata-engine
description: Defines how TubeFlow generates YouTube metadata — inputs, analysis process, generation workflow, output structure, and validation rules. Apply when building or modifying any metadata generation feature, prompt, or pipeline.
---

## Governing Standard

All metadata produced by this engine must pass the [[metadata-quality-standard]] checklist before being returned. That skill defines what good looks like. This skill defines how to get there.

---

## Inputs

**Required (at least one must be present):**
- `transcript` — primary content signal; drives keyword extraction and description tone
- `title_hints` — creator-supplied phrasing; always treated as directional, never final

**Optional (enrich output quality when present):**
- `video_frames` — extracted frames; used to infer visual content, pacing, and niche signals
- `thumbnail` — used for CTR alignment between title and visual promise
- `target_keywords` — creator-supplied SEO targets; incorporated naturally, never stuffed
- `channel_profile` — channel name, niche, average tone, audience size tier
- `audience_profile` — demographic, intent type, knowledge level, platform behavior
- `video_context` — series position, related videos, campaign context
- `niche` — explicit niche override; skips niche detection if provided

**Fallback behavior when inputs are missing:**
- No transcript → rely on title hints, frames, and channel profile; flag low-confidence output
- No channel profile → treat as a standalone video; apply neutral tone defaults
- No audience profile → infer from niche and transcript vocabulary
- No keywords → extract from transcript; do not fabricate high-volume keywords
- No thumbnail → skip CTR thumbnail-title alignment check

---

## Generation Pipeline

```
Input
  → Content Analysis
  → Audience Intent Detection
  → Niche Detection
  → Keyword Extraction
  → Metadata Generation  (title → description → tags)
  → Metadata Validation
  → Final Output
```

Each stage gates the next. If Content Analysis cannot establish a clear subject, flag and request more input before proceeding.

---

## Stage Definitions

**1. Content Analysis**
Parse the transcript for: core topic, subtopics, key moments, tone, vocabulary level, and any explicit claims or outcomes. Frame extraction informs pacing and visual emphasis. This stage produces a content summary used by all downstream stages.

**2. Audience Intent Detection**
Classify the viewer's likely intent using the content summary:
- Informational → viewer wants to understand something
- Instructional → viewer wants to accomplish something
- Evaluative → viewer is comparing or deciding
- Inspirational → viewer wants motivation or proof

Intent determines the title's lead angle and the description's opening hook.

**3. Niche Detection**
If `niche` is not explicitly provided, infer from transcript vocabulary, channel profile, and frame content. For ambiguous content (e.g., a productivity video on a finance channel), apply the channel profile's primary niche. If multi-niche, identify the dominant niche and note the secondary. Niche controls tone, title style, and tag category mix per [[metadata-quality-standard]].

**4. Keyword Extraction**
Extract 10–20 candidate keywords ranked by: relevance to core topic, likely search volume signal (based on phrasing specificity), and natural fit in a title or description. Apply `target_keywords` as must-include anchors. Discard keywords that cannot be placed naturally without stuffing.

**5. Title Generation**
Generate 3 title candidates. Apply the niche-specific title style from [[metadata-quality-standard]]. Select the strongest based on: intent match, specificity, CTR potential, and thumbnail alignment (if thumbnail is provided). Final title must be 50–70 characters.

**6. Description Generation**
Structure: hook (2–3 lines, no "In this video") → content summary → timestamps → resources/links → CTA. Embed 2–4 keywords naturally in the first 100 words. Tone is set by niche and audience profile. Length: 150–300 words for standard videos.

**7. Tag Generation**
Produce 8–15 tags. Mix: exact-match topic, broad category, niche long-tail, channel brand if known. Derive from the keyword extraction shortlist. No duplicates, no irrelevant trend tags.

---

## Channel Profile Influence

When `channel_profile` is present:
- Match the established tone (casual vs. authoritative vs. technical)
- Avoid titles that would feel inconsistent with existing video titles on the channel
- Apply the channel's niche as the default niche if content is ambiguous
- Incorporate channel brand terms in tags if appropriate

---

## Audience Profile Influence

When `audience_profile` is present:
- Vocabulary level shapes description complexity
- Knowledge level determines whether to explain jargon or assume familiarity
- Platform behavior (mobile-first, desktop) affects description formatting preference

---

## Multi-Niche Handling

If content spans two niches (e.g., finance + productivity), generate metadata for the dominant niche. Note the secondary niche in the description's keyword layer and tag mix. Never try to optimize for both niches in the title — it weakens both.

---

## Output Format

```json
{
  "title": "",
  "description": "",
  "tags": []
}
```

All three fields are always returned. An incomplete output is not a valid output.

---

## Validation Before Return

Before finalizing output, run the [[metadata-quality-standard]] Metadata Review Checklist:
- Title: length, no stuffing, intent match, no clickbait
- Description: opens with value, keywords in first 100 words, timestamps present if applicable
- Tags: count 8–15, no duplicates, niche-relevant mix
- Overall: human-written tone, intent-matched, niche-appropriate

If any check fails, revise that field. Do not return metadata that fails validation.
