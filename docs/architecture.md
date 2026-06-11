# Architecture

## Overview

TubeFlow is an AI-powered YouTube publishing platform.

The primary goal of TubeFlow is to help creators generate professional-grade metadata and publish videos with minimal manual effort.

Core workflow:

Upload Content
↓
Analyze Content
↓
Generate Metadata
↓
Review Metadata
↓
Publish To YouTube

The Metadata Engine is the most important component of the platform.

---

## System Components

TubeFlow consists of four major systems:

1. Frontend
2. Backend API
3. Metadata Engine
4. YouTube Integration

Each system should remain modular and independently maintainable.

---

## Frontend

### Stack

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui

### Responsibilities

* User authentication
* Dashboard
* Content upload
* Metadata review
* Workflow management
* YouTube connection management

The frontend should remain lightweight and consume backend APIs.

Business logic should not live in the frontend.

---

## Backend

### Stack

* FastAPI
* Python
* Pydantic v2

### Responsibilities

* API layer
* Metadata generation
* Workflow execution
* User management
* YouTube integration
* Data persistence

Routes should remain thin.

Business logic should live inside services.

---

## Metadata Engine

The Metadata Engine is the core product.

### Inputs

* Transcript
* Thumbnail
* Video Frames
* Keywords
* Channel Profile
* Video Context

### Outputs

* Title
* Description
* Tags

The engine should produce professional-grade metadata that feels comparable to high-performing YouTube channels.

---

## AI Layer

Supported Providers:

* OpenAI
* Anthropic

The system should use a provider abstraction layer.

AI providers should be replaceable without affecting business logic.

---

## Database

### Primary Database

PostgreSQL

### Core Tables

* users
* channels
* youtube_credentials
* metadata_requests
* metadata_results
* workflow_runs

Database design should support future scalability.

---

## YouTube Integration

Responsibilities:

* Channel connection
* OAuth authentication
* Video uploads
* Metadata updates
* Scheduling

TubeFlow publishes content on behalf of connected creators.

OAuth should be used for all publishing operations.

---

## Workflow Layer

A workflow is a sequence of actions.

Example:

Upload
↓
Analyze
↓
Generate Metadata
↓
Review
↓
Publish

Workflows should be:

* Modular
* Reusable
* Observable
* Fault tolerant

---

## Security

Requirements:

* Environment variables for secrets
* OAuth token protection
* Input validation
* Secure credential storage
* Access control

Sensitive information must never be stored in source code.

---

## Scalability Principles

Prefer:

* Service-based architecture
* Reusable modules
* Provider abstraction
* Stateless APIs

Avoid:

* Tight coupling
* Duplicate business logic
* Provider-specific dependencies

---

## Development Phases

### Phase 1

Metadata Engine MVP

### Phase 2

Frontend Metadata Interface

### Phase 3

Database Integration

### Phase 4

YouTube Publishing

### Phase 5

Workflow Automation

### Phase 6

Advanced AI Agents

---

## Success Definition

TubeFlow succeeds when a creator can upload content, receive professional-quality metadata, review the results, and publish to YouTube through a fast and reliable workflow.
