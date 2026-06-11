# CLAUDE.md – TubeFlow

## Project Name

TubeFlow

## Mission

TubeFlow is an AI-powered YouTube publishing platform that helps creators produce professional-quality metadata and publish videos with minimal manual effort.

TubeFlow’s primary goal is **not** video generation.  
The core product is **high-performing, professional-grade YouTube metadata** plus simple publishing.

A creator should be able to upload a video and receive metadata that feels comparable to what an experienced YouTube content team would create.

## Core Product Philosophy

Most creators struggle with:

- Strong titles  
- Professional descriptions  
- Relevant tags  
- Consistency across uploads  
- YouTube SEO understanding  

TubeFlow exists to solve these problems.

The AI should act like:

- A YouTube growth strategist  
- An SEO specialist  
- A content manager  

Every feature should support this mission.

## Primary Workflow

Typical flow:

1. User uploads a video (optionally transcript, title idea, keywords).  
2. TubeFlow analyzes:
   - Transcript / content  
   - Thumbnail or frames  
   - Keywords (if provided)  
   - Channel profile (niche, audience, language, tone)  
   - Video type (tutorial, vlog, music, etc.)  
3. TubeFlow generates:
   - Title  
   - Description  
   - Tags  
   - Other SEO-related metadata (e.g. category, language; thumbnail suggestions later)  
4. User reviews and lightly edits.  
5. User publishes or schedules to YouTube.

The workflow must stay fast, simple, and creator-focused.

## Core Competitive Advantage

The **metadata engine** is TubeFlow’s core.

- Uploading to YouTube is a feature.  
- Professional metadata generation is the product.

All technical/product decisions should protect and improve the metadata engine.

## Metadata Quality Standards

Metadata should feel like it was created by an experienced YouTube team.

It must be:

- Professional  
- Natural / human-sounding  
- SEO-aware  
- Audience- and niche-aware  
- Brand-aware  

It must **not** be:

- Generic  
- Obviously AI-generated  
- Keyword-stuffed  
- Spammy or misleading  

The system should prioritize:

- Relevance  
- Viewer intent  
- Content understanding  

over raw keyword volume.

Metadata generation should combine:

- Transcript/content understanding  
- Channel/niche context  
- Audience and intent reasoning  
- Visual signals (thumbnail/frames) when available  

## Title Principles

Titles should:

- Communicate value clearly  
- Add curiosity when appropriate  
- Match real video content  
- Follow niche-specific best practices  
- Avoid deceptive clickbait  

Different niches (tutorials, gaming, business, music, vlogs, etc.) require different title styles.  
TubeFlow must adapt titles to niche and audience, not use a single pattern.

## Description Principles

Descriptions should resemble those written by professional creators.

They should:

- Explain the video’s value  
- Improve discoverability with keywords used naturally  
- Set context and expectations  
- Stay readable and clear  

Descriptions serve **viewers first**, search engines second.

## Tag Principles

Tags should be:

- Highly relevant and topic-specific  
- Niche-aware and aligned with viewer intent  

Avoid:

- Irrelevant tags  
- Low-quality, generic tags  

Quality > quantity.

Tags should generally cover:

- Main topic and key phrases  
- Variants and long-tail searches  
- Appropriate category tags (e.g. “programming tutorial”, “fitness workout”, “travel vlog”, “study music”)  

No niche-specific tags are hardcoded globally; they must be inferred from content and channel profile.

## Multi-Niche Design

TubeFlow must support many niches, e.g.:

- Programming / development  
- Education  
- Finance / business  
- Fitness / health  
- Technology / gadgets  
- Gaming / streaming  
- Music / mixes  
- Travel / lifestyle / vlogs  
- Productivity / self-improvement  

The system must **never assume a single niche**.  
Metadata must adapt to each video and channel.

## YouTube Integration Principles

- Each customer connects their **own** Google Cloud / YouTube API project.  
- TubeFlow uses **OAuth 2.0** (Client ID + Secret) to obtain tokens to upload/manage videos.  
- API keys alone are **not** enough for uploads or writes; OAuth is required for modifying YouTube data.[web:115][web:119][web:120]  
- Quota behavior is **per customer’s project**, not globally shared.  
- TubeFlow should guide customers to:
  - Create a Google Cloud project  
  - Enable YouTube Data API v3  
  - Create OAuth credentials  
  - Paste Client ID/Secret and complete connection  

## Technical Direction

Frontend:

- **Next.js** (App Router)  
- **TypeScript**  
- **Tailwind CSS** (+ component library like shadcn/ui)

Backend:

- **FastAPI** (Python)  
- API endpoints for:
  - Auth / YouTube connection  
  - Metadata generation  
  - Workflow/job management  

Database:

- **PostgreSQL**

Planned structure:

- `backend/` – FastAPI app, AI orchestration, YouTube integration, metadata engine  
- `frontend/` – Next.js app (dashboard, setup wizards, flows)  
- `docs/` – Architecture, YouTube API, metadata engine, workflows  
- `skills/` – Agent skills (metadata generator, YouTube integration, workflow orchestrator)  

Architecture should be modular, maintainable, scalable, and friendly to future agentic/LLM frameworks (e.g. LangGraph).[web:134][web:139][web:142]

## AI Design Principles

The AI should reason about:

- What the video is about (topic, angle, format)  
- Who the audience is  
- Why someone would click  
- What viewers are searching for and expect  
- How professional creators in that niche package content  

It should:

- Use transcript/context as primary truth  
- Use thumbnail/frames as secondary visual signals  
- Respect channel tone, language, and brand when provided  

Focus on **effective packaging**, not maximizing keyword count.

## Development Principles

Prefer:

- Simplicity  
- Modularity  
- Reusability  
- Scalability  
- Maintainability  

Avoid:

- Premature optimization  
- Overengineering  
- Hardcoded niche-specific logic  
- Duplicate implementations  

Build features in small, testable increments.  
Keep concerns separated: metadata engine, YouTube integration, workflows, frontend.

## Security Principles

- Never store secrets in source code.  
- Never expose tokens in logs or client-side code.  
- Never commit credentials.  
- Use environment variables for all sensitive values (API keys, OAuth secrets, DB URLs).  
- Design OAuth and credential storage with security best practices.

## Non-Goals

TubeFlow is **not**:

- A full video generation platform  
- Primarily an analytics dashboard  
- A short-term clickbait growth hack tool  

Focus: **sustainable, professional channel growth** via high-quality metadata and smooth publishing.

## Roadmap (High-Level)

- Phase 1: Professional Metadata Engine  
- Phase 2: YouTube Publishing Integration  
- Phase 3: Workflow Automation  
- Phase 4: Research & Content Planning  
- Phase 5: Advanced AI Workflow Orchestration  

## Success Definition

TubeFlow succeeds when a creator can upload a video and immediately receive metadata that:

- Looks professional  
- Aligns with their niche and audience  
- Is SEO-aware and discoverable  

…so they can publish with minimal edits, confident it matches or exceeds a professional YouTube content team.