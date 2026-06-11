from __future__ import annotations

from typing import List, Optional


def build_metadata_prompt(
    *,
    transcript: str,
    intent: str,
    niche: str,
    keywords: List[str],
    duration_minutes: float,
    title_hint: Optional[str],
    channel_profile_json: Optional[str],
    visual_context: Optional[str] = None,
    video_description: Optional[str] = None,
    extra_context: Optional[str] = None,
    # Content profile fields — resolved by Context Prioritization Layer
    content_type: str = "general",
    genre: str = "",
    mood: str = "neutral",
    language: str = "en",
    target_keywords_raw: Optional[List[str]] = None,
) -> str:
    keyword_line = (
        ", ".join(keywords)
        if keywords
        else "none provided — infer from transcript"
    )

    # --- User context block (mandatory — placed before transcript so the model anchors on it) ---
    user_context_parts: List[str] = []

    if title_hint:
        user_context_parts.append(
            f"TITLE HINT (mandatory — your title MUST directly reflect this topic and angle):\n{title_hint}"
        )
    if target_keywords_raw:
        kw_str = ", ".join(target_keywords_raw)
        user_context_parts.append(
            f"TARGET KEYWORDS (mandatory — MUST appear naturally in title if they fit, in description, and as tags):\n{kw_str}"
        )
    if video_description:
        desc_excerpt = video_description[:1000]
        if len(video_description) > 1000:
            desc_excerpt += "\n[truncated]"
        user_context_parts.append(
            f"VIDEO DESCRIPTION (mandatory — all metadata MUST align with this content type, topic, and intent):\n{desc_excerpt}"
        )
    if extra_context:
        user_context_parts.append(
            f"CREATOR NOTES (follow these instructions):\n{extra_context[:500]}"
        )
    if channel_profile_json:
        user_context_parts.append(f"CHANNEL CONTEXT:\n{channel_profile_json}")

    user_context_block = ""
    if user_context_parts:
        user_context_block = (
            "\nUSER CONTEXT (highest priority — overrides transcript analysis when they conflict):\n"
            + "\n\n".join(user_context_parts)
            + "\n"
        )

    # --- Transcript ---
    transcript_excerpt = transcript[:3000]
    if len(transcript) > 3000:
        transcript_excerpt += "\n[transcript truncated]"

    # --- Content profile for CONTENT ANALYSIS section ---
    content_profile_lines: List[str] = [f"- Content Type: {content_type}"]
    if genre:
        content_profile_lines.append(f"- Genre/Style: {genre}")
    if language and language != "en":
        content_profile_lines.append(f"- Language: {language}")
    if mood and mood != "neutral":
        content_profile_lines.append(f"- Mood: {mood}")
    content_profile_lines += [
        f"- Audience Intent: {intent}",
        f"- Niche: {niche}",
        f"- Estimated Duration: {duration_minutes} minutes",
        f"- Key Keywords: {keyword_line}",
    ]
    content_profile_str = "\n".join(content_profile_lines)

    # --- Niche style guide ---
    niche_style_guide = f"""NICHE-SPECIFIC STYLE GUIDE (active niche: "{niche}"):
- programming: Outcome + specificity titles ("Build X in Y Minutes" / "5 Ways to Fix X"). Technical, concise descriptions. Tags: language, framework, use case.
- business: Problem or framework titles ("Why X Fails" / "The X Framework for Y"). Professional, practical tone. Tags: industry, stage, strategy.
- finance: Contrarian or data-led titles ("The X Myth" / "Why X Returns Y%"). Authoritative, measured tone. Tags: strategy, asset class, timeframe.
- education: Question or insight titles ("Why X Works" / "The Truth About X"). Structured, credible tone. Tags: subject, level, exam or topic.
- fitness: Result + timeframe titles ("Lose X in Y Weeks" / "Build X in 30 Days"). Direct, motivating tone. Tags: goal, method, body focus.
- gaming: Event + reaction titles ("I Beat X Using Y" / "The Most Broken Build in X"). Casual, energetic tone. Tags: game title, mode, platform.
- lifestyle: Personal story or insight titles ("How I Changed X" / "What X Taught Me About Y"). Warm, conversational tone. Tags: theme, relatable trigger.
- music: Mood-led or identity-led titles ("Song Title | Artist" / "Genre + Mood"). Evocative, audience-matching tone. Tags: artist, genre, language, mood, song name.
Apply the style for "{niche}" — if "{niche}" is not listed, apply the closest match."""

    # --- Intent framing ---
    intent_framing = f"""INTENT-SPECIFIC TITLE FRAMING (active intent: "{intent}"):
- informational: Lead with insight or contrast — "Why X Works", "The Truth About X", "X Explained"
- instructional: Lead with outcome + specificity — "Build X in Y Minutes", "5 Steps to X", "How to X Without Y"
- evaluative: Lead with comparison or verdict — "X vs Y: The Real Difference", "Best X for Y in Z", "Is X Worth It?"
- inspirational: Lead with the result — "How I X in 30 Days", "What X Taught Me About Y", "From X to Y"
Apply the framing for "{intent}"."""

    title_examples = """TITLE QUALITY EXAMPLES:
Good: "The Compound Interest Mistake 90% of Investors Make" — contrarian, data-led, finance (52 chars)
Good: "Why Most Python Developers Get Decorators Wrong" — insight-led, informational, programming (48 chars)
Bad:  "Python FastAPI Tutorial REST API Building Guide 2024" — keyword-stuffed, no value hook
Bad:  "How to Build Stuff With Code" — too vague, zero specificity"""

    # --- Mandatory override rules (only emitted when user context is present) ---
    mandatory_rules: List[str] = []
    if title_hint:
        mandatory_rules.append(
            f'1. Title hint is binding: your title MUST be about "{title_hint}" — same topic, tone, and angle. Do not drift.'
        )
    if target_keywords_raw:
        kw_str = ", ".join(target_keywords_raw)
        mandatory_rules.append(
            f'2. Target keywords are binding: "{kw_str}" MUST appear naturally in the description and tags, and in the title if they fit.'
        )
    if video_description:
        mandatory_rules.append(
            f'3. Video description is binding context: content type is "{content_type}", genre is "{genre or "N/A"}", '
            f'mood is "{mood}". Generate metadata appropriate for this — NOT a generic tutorial or vlog format.'
        )
    if content_type != "general":
        mandatory_rules.append(
            f'4. Content type is "{content_type}": do NOT generate tutorial-style or vlog-style metadata if the content type is "{content_type}".'
        )

    mandatory_block = ""
    if mandatory_rules:
        mandatory_block = (
            "\nMANDATORY OVERRIDE RULES (these override everything else — violating them invalidates the output):\n"
            + "\n".join(mandatory_rules)
            + "\n"
        )

    return f"""You are a professional YouTube metadata specialist and SEO strategist.
Your task is to generate high-quality, professional YouTube metadata for the video below.
Metadata must feel like it was written by an experienced content team on a 100K–10M subscriber channel.
{user_context_block}
CONTENT ANALYSIS:
{content_profile_str}

{niche_style_guide}

{intent_framing}

{title_examples}

VIDEO TRANSCRIPT:
{transcript_excerpt}

VISUAL CONTEXT:
{visual_context if visual_context else "No frame analysis available."}
If this is a music video with no spoken transcript, use the visual frames provided above (if any) to infer the genre, mood, aesthetic, and style when generating the title, description, and tags.
{mandatory_block}
OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object with this exact structure — no markdown, no code fences, no commentary:
{{
  "title": "...",
  "description": "...",
  "tags": ["..."]
}}

TITLE RULES:
- Exactly 50–70 characters (count every character carefully before finalising)
- Leads with specific value, not a category label
- Matches the viewer's search intent — apply the intent framing for "{intent}" above
- No keyword stuffing, no all-caps, no "you won't believe"
- Apply the niche-specific style for "{niche}" from the style guide above
- If a title hint was provided, the title MUST reflect that topic and angle

DESCRIPTION RULES:
- First 2–3 lines must deliver standalone value — no "In this video I..."
- Include 2–4 target keywords naturally in the first 100 words
- Use short paragraphs and line breaks — no walls of text
- Structure: hook → what you'll learn/experience → timestamps (if > 5 min) → resources → CTA
- 150–300 words total
- If target keywords were provided, they MUST appear in the first 100 words

TAG RULES:
- Exactly 8–15 tags
- Mix: exact-match topic, broad category, niche long-tail, channel brand if known
- Tags reflect how a viewer searches, not how a creator labels
- No duplicates, no irrelevant trend-chasing tags
- If target keywords were provided, include every one as a tag"""
