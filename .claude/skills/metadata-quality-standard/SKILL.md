---
name: metadata-quality-standard
description: Defines TubeFlow's metadata quality standards. Apply this skill whenever writing, reviewing, generating, or evaluating YouTube metadata — titles, descriptions, or tags — across any niche or feature.
---

## Purpose

Single source of truth for metadata quality across TubeFlow. Does not generate metadata — defines the standard every output must meet. The bar: feels like an experienced content strategist on a 100K–10M subscriber channel, not a template.

---

## Titles

**What makes a title high-quality:**
- Leads with the specific value, not the category ("Build a REST API in 12 Minutes" not "Python Tutorial")
- Matches the viewer's search intent at the moment they'd find this video
- Creates curiosity or surfaces a specific outcome without overpromising
- 50–70 characters — fully readable in search results
- Uses natural language, not keyword strings
- Numbers are concrete ("5 Mistakes" beats "Common Mistakes")

**Good titles:**
- `I Spent 30 Days Only Using AI to Code — Here's What Broke`
- `The Compound Interest Mistake 90% of Investors Make`
- `5 Python Habits That Slow Down Senior Developers`
- `This Morning Routine Changed My Productivity for 6 Months`

**Bad titles:**
- `Python Tutorial for Beginners 2024 | Learn Python Fast`
- `AMAZING fitness tips!! You won't believe #3!!!`
- `How to Make Money Online (Shocking Results)`
- `JavaScript React Tutorial Complete Course Full Stack`

**Rules:** No all-caps screaming. No "you won't believe." No vague curiosity gaps. No keyword stuffing in the title itself.

---

## Descriptions

**What makes a description high-quality:**
- First 2–3 lines must stand alone — this is what shows before "Show More"
- Opens with the video's value proposition, not "In this video I..."
- Naturally includes 2–4 target keywords in the first 100 words
- Uses short paragraphs and line breaks — not a wall of text
- Includes a logical structure: hook → what you'll learn → chapters → resources → CTA
- Timestamps (chapters) improve retention and search indexing
- Links and CTAs at the bottom, not interrupting the content summary

**Good description (opening lines):**
> Most developers waste hours on state management because they picked the wrong tool for the job. This video breaks down when to use useState, useReducer, and Zustand — with real examples from production codebases.

**Bad description (opening lines):**
> In this video I will be showing you how to use React state management. Please like and subscribe. This is a tutorial for beginners and intermediate developers who want to learn React...

**Rules:** Never start with "In this video." No keyword dumps at the bottom. No fake urgency. Timestamps are always included if the video is over 5 minutes.

---

## Tag Strategy

**What makes tags high-quality:**
- 8–15 tags total — quality over quantity
- Mix of: exact-match topic, broad category, niche-specific long-tail, channel brand
- Tags reflect how a viewer would actually search, not how a creator would label
- No duplicate variations of the same phrase
- No irrelevant tags to chase views

**Good tags (Python tutorial video):**
`python for beginners`, `learn python`, `python tutorial 2024`, `python projects`, `programming tutorial`, `python tips`, `software development`, `coding for beginners`

**Bad tags:**
`python`, `tutorial`, `coding`, `programming`, `learn`, `beginner`, `tips`, `youtube`, `viral`, `trending`, `free course`, `python python python`

---

## SEO Principles

- YouTube SEO is intent-matching, not keyword density
- Algorithm prioritizes watch time and CTR — metadata gets viewers in, content keeps them
- Titles and first 100 description characters are the highest-weight SEO signals
- Chapters improve discovery via Google snippets; tags help "up next" more than ranking

---

## Audience Intent

Before writing metadata, identify the viewer's intent:
- **Informational:** "how does X work" → lead with clarity and depth
- **Instructional:** "how to do X" → lead with outcome and time investment
- **Evaluative:** "X vs Y" or "best X" → lead with the comparison or verdict
- **Inspirational:** "X transformation" → lead with the result, not the process

Metadata that mismatches intent — e.g., an instructional title on a high-level concept video — increases bounce rate and tanks ranking.

---

## CTR Considerations

High CTR titles share these traits:
- Specific over vague ("3 hours" beats "fast")
- Outcome-oriented ("I got 10K subscribers doing this")
- Addresses a felt pain or desire the viewer already has
- Thumbnail and title work as a unit — the title answers what the thumbnail teases

Avoid: manufactured mystery, emotional manipulation, misleading specificity.

---

## Niche-Specific Adaptation

| Niche | Title style | Description tone | Tag focus |
|---|---|---|---|
| Programming | Outcome + specificity | Technical, concise | Language, framework, use case |
| Education | Question or insight | Structured, credible | Subject, level, exam/topic |
| Finance | Contrarian or data-led | Authoritative, measured | Strategy, asset class, audience |
| Fitness | Result + timeframe | Direct, motivating | Goal, method, body focus |
| Gaming | Event + reaction | Casual, energetic | Game title, mode, platform |
| Business | Problem or framework | Professional, practical | Industry, stage, strategy |
| Productivity | System or habit | Clean, actionable | Tool, method, outcome |
| Lifestyle | Personal story or insight | Warm, conversational | Theme, relatable trigger |

---

## Metadata Review Checklist

Run every generated metadata set through this before returning it to a user.

**Title**
- [ ] 50–70 characters
- [ ] No keyword stuffing
- [ ] Matches viewer search intent
- [ ] No clickbait or misleading claims
- [ ] Reads as human-written

**Description**
- [ ] First 2–3 lines deliver standalone value
- [ ] Does not open with "In this video"
- [ ] Contains 2–4 natural keywords in first 100 words
- [ ] Includes timestamps if video > 5 min
- [ ] Links and CTAs are at the bottom

**Tags**
- [ ] 8–15 tags total
- [ ] No duplicates or near-duplicates
- [ ] Mix of broad, specific, and long-tail
- [ ] No irrelevant trend-chasing tags

**Overall**
- [ ] Niche-appropriate tone and style
- [ ] Audience intent is correctly identified and matched
- [ ] Output does not read like AI-generated filler
