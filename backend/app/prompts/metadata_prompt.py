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
    is_short: bool = False,
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

    # --- Mode-specific output rules ---
    if is_short:
        output_rules = f"""SHORTS MODE — This is a YouTube Short (≤60s portrait video).
All metadata must be optimised for the Shorts feed: mobile-first, fast-hook, emotion-driven.

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object with this exact structure — no markdown, no code fences, no commentary:
{{
  "title": "...",
  "description": "...",
  "tags": ["..."]
}}

TITLE RULES (SHORTS):
- 15–40 characters maximum — count carefully before finalising
- Punchy, mobile-first — must stop the scroll in 0.5 seconds
- Lead with emotion, curiosity, payoff, or shock — no slow build-ups
- Emoji is encouraged if it matches the tone (1–2 max)
- Do NOT write a long explanatory title — short and striking wins
- Good examples: "Wait For The Ending 😳" / "This Changed Everything" / "Beautiful Voice ❤️" / "Nobody Expected This"
- If a title hint was provided, the title MUST reflect that topic and angle

DESCRIPTION RULES (SHORTS):
- 50–150 words maximum — no timestamp sections needed
- First line must be a hook — a teaser, question, or bold statement
- Brief context about the content
- End with 2–4 relevant hashtags naturally included (e.g. #shorts #viral)
- Do NOT use long paragraph structures — keep it tight and scannable

TAG RULES (SHORTS):
- Exactly 8–15 tags
- "#shorts" MUST be the very first tag — this is mandatory
- Follow with "#viral", "#trending", then niche-specific tags
- Include content topic tags, mood/style tags, and channel niche tags
- No duplicates, no irrelevant tags
- If target keywords were provided, include every one as a tag"""
    else:
        output_rules = f"""OUTPUT REQUIREMENTS:
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
{output_rules}"""


def build_enhanced_analysis_prompt(
    *,
    transcript: str,
    title_hint: Optional[str] = None,
    target_keywords: Optional[List[str]] = None,
    video_description: Optional[str] = None,
    extra_context: Optional[str] = None,
    channel_profile_json: Optional[str] = None,
    detected_language_hint: Optional[str] = None,
    frame_count: int = 0,
    is_short: bool = False,
) -> tuple[str, str]:
    """
    Build a combined analysis + metadata prompt for the enhanced pipeline.

    Returns (system_message, user_prompt). The AI produces a single JSON object
    containing visual_analysis, content_classification, detected_language,
    video_summary, and metadata — all in one round-trip.
    """

    system_message = (
        "You are an expert video content analyst and YouTube metadata specialist. "
        "Analyze the provided video frames and transcript to produce structured analysis "
        "and optimised YouTube metadata. "
        "Respond ONLY with a single valid JSON object — no markdown, no code fences, "
        "no commentary before or after the JSON."
    )

    # --- Section 1: User context block (highest priority) ---
    has_user_context = any([
        title_hint, target_keywords, video_description, extra_context, channel_profile_json
    ])

    if has_user_context:
        kw_line = ", ".join(target_keywords) if target_keywords else "not provided"
        user_context_block = f"""
=== USER CONTEXT — MANDATORY PRIORITY ===
These fields OVERRIDE everything: your visual analysis, content classification, and any transcript inference.
Never let frames or transcript contradict explicit user instructions.

TITLE HINT: {title_hint or "not provided"}
TARGET KEYWORDS: {kw_line}
VIDEO DESCRIPTION: {(video_description or "not provided")[:1000]}
CREATOR NOTES: {(extra_context or "not provided")[:500]}
CHANNEL CONTEXT: {channel_profile_json or "not provided"}

Rules when user context is present:
- TITLE HINT is binding — your title must reflect this topic, angle, and style exactly.
- TARGET KEYWORDS must appear naturally in title (if they fit), description, and as tags.
- VIDEO DESCRIPTION defines the content type, genre, and intent — never contradict it.
- If user says this is a music video / song, generate song-style metadata regardless of transcript.
"""
    else:
        user_context_block = ""

    # --- Section 2: Content type rules ---
    content_type_rules = """
=== CONTENT TYPE CLASSIFICATION ===
Classify into exactly one of:
  music_video | podcast | tutorial | education | gaming | vlog | short_film | interview | review | news | fitness | business | other

CONTENT-TYPE-SPECIFIC METADATA RULES (mandatory — apply when generating the "metadata" section):

music_video:
  - Title format: "Artist Name | Song Title" OR "Song Title - Artist Name" OR song-evocative phrase.
  - NEVER use: "The Truth About…", "Guide to…", "How To…", "Understanding…", "Importance of…", "Learn…".
  - Description: evocative, mood-evoking, references feel/genre/lyrics/artist. NOT informational.
  - Tags: artist name, song title, genre, language, mood, year, "official video", "official audio", etc.

tutorial:
  - Title: action + outcome ("Build X in Y Minutes", "Fix X Without Y", "5 Steps to X").
  - Description: step-by-step value hook, what viewer will learn.
  - Tags: tool names, skill level, "how to", specific topic keywords.

education:
  - Title: question or insight-led ("Why X Works", "The Truth About X", "X Explained Simply").
  - Description: structured, credible, sets expectations.
  - Tags: topic, level, subject, "explained", "for beginners" / "advanced".

gaming:
  - Title: event + reaction ("I Beat X Using Y", "The Most Broken Build in X", "We Found a Secret").
  - Description: casual, energetic, sets up the video's highlight.
  - Tags: game title, mode, platform, character, strategy type.

vlog:
  - Title: personal story hook ("Day In My Life", "How I Changed X in 30 Days", "We Did X").
  - Description: warm, conversational, invites viewer into the experience.
  - Tags: lifestyle, location, theme, creator name.

review:
  - Title: verdict-led ("X vs Y: The Real Difference", "Best X for Y in 2024", "Is X Worth It?").
  - Tags: product name, category, brand, "review", "honest review".

podcast:
  - Title: guest or topic ("With [Guest]: Topic", "EP 42: Topic Discussion").
  - Tags: episode number, topic, guest name, "podcast".

fitness:
  - Title: result + timeframe ("Lose X in Y Weeks", "Build X in 30 Days").
  - Tags: workout type, body focus, equipment, duration.

business:
  - Title: problem or framework ("Why X Fails", "The X Framework for Y", "How I Built X to $Y").
  - Tags: industry, stage, strategy, niche.

other:
  - Apply the closest matching style from above based on visual and transcript evidence.
"""

    # --- Section 3: Language ---
    if detected_language_hint:
        language_section = f"""
=== LANGUAGE DETECTION ===
Whisper speech recognition detected: {detected_language_hint}
Use this as a strong signal. All metadata title, description, and tags should match the content's language and cultural context.
If the content is Hindi/Urdu/Punjabi, metadata may use English but must reflect that cultural context (e.g., Bollywood, desi music, etc.).
"""
    else:
        language_section = """
=== LANGUAGE DETECTION ===
No language pre-detected. Infer language from transcript text and visual cues.
Ensure metadata matches the content's language and cultural context.
"""

    # --- Section 4: Frame context note ---
    if frame_count > 0:
        frame_note = f"{frame_count} frames extracted from the video are included above as images. Analyze them alongside the transcript."
    else:
        frame_note = "No video frames available. Base visual_analysis on transcript and user context only; set unknown visual fields to empty strings."

    # --- Section 5: Transcript ---
    transcript_excerpt = transcript[:3000]
    if len(transcript) > 3000:
        transcript_excerpt += "\n[transcript truncated]"

    # --- Section 6: Output format (Shorts vs regular) ---
    if is_short:
        metadata_rules = """
For the "metadata" section, apply YouTube Shorts rules:
- title: 15–40 characters, mobile-first, emotion-driven, 1–2 emojis encouraged.
- description: 50–150 words, strong hook on first line, 2–4 hashtags.
- tags: 8–15 items; "#shorts" MUST be first, followed by "#viral", "#trending", then topic tags.
"""
    else:
        metadata_rules = """
For the "metadata" section, apply standard YouTube video rules:
- title: 50–70 characters, specific value, matches search intent and content type rules above.
- description: 150–300 words, strong hook in first 2–3 lines, natural keyword use, structured.
- tags: 8–15 items, mix of exact-match, broad, and long-tail tags. No duplicates.
"""

    user_prompt = f"""{user_context_block}
{content_type_rules}
{language_section}
=== VIDEO FRAMES ===
{frame_note}

=== VIDEO TRANSCRIPT ===
{transcript_excerpt}

=== TASK ===
Analyze ALL available information (frames, transcript, user context) and return a single JSON object.
{metadata_rules}
Return ONLY this JSON structure with all fields populated. No other text:

{{
  "visual_analysis": {{
    "visual_style": "<cinematic|casual|animated|screen_recording|studio|outdoor|mixed>",
    "content_type": "<describe what is visually happening in one phrase>",
    "visual_theme": "<dark|bright|colorful|minimal|documentary>",
    "estimated_niche": "<your best niche estimate from visuals>",
    "people_present": true,
    "text_present": false,
    "scene_summary": "<one sentence describing what the frames show>"
  }},
  "content_classification": {{
    "type": "<music_video|podcast|tutorial|education|gaming|vlog|short_film|interview|review|news|fitness|business|other>",
    "confidence": 0.0
  }},
  "detected_language": "<BCP-47 code, e.g. 'hi', 'en', 'ur', 'pa' — infer from transcript if audio hint unavailable>",
  "video_summary": {{
    "summary": "<2–3 sentence content summary>",
    "main_topics": ["<topic1>", "<topic2>"],
    "keywords": ["<keyword1>", "<keyword2>"],
    "entities": ["<person, brand, or product names>"],
    "audience": "<who this video is for>",
    "tone": "<formal|casual|educational|entertaining|motivational|emotional>",
    "genre": "<specific sub-genre, e.g. 'romantic hindi song', 'python tutorial', 'gaming vlog'>",
    "language": "<primary content language name, e.g. 'Hindi', 'English'>"
  }},
  "metadata": {{
    "title": "<optimized YouTube title following content-type rules above>",
    "description": "<optimized YouTube description>",
    "tags": ["<tag1>", "<tag2>"]
  }}
}}"""

    return system_message, user_prompt
