---
name: frontend-engineering
description: Defines TubeFlow's frontend development standards — App Router, component architecture, state management, API integration, accessibility, and performance. Apply when writing, reviewing, or scaffolding any frontend code.
---

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui

---

## Folder Structure

```
app/                  → routes, layouts, pages (server components by default)
app/(auth)/           → auth group: login, register, callback
app/(dashboard)/      → protected creator routes
components/ui/        → shadcn/ui primitives and custom base components
components/forms/     → form compositions
components/layout/    → Sidebar, Navbar, PageWrapper
components/           → feature-level components (VideoCard, MetadataEditor)
hooks/                → custom React hooks (useVideos, useMetadata, usePublish)
lib/                  → api client, auth helpers, utils, constants, validations
services/             → typed API call functions (one file per domain)
types/                → TypeScript interfaces and types (one file per domain)
```

---

## App Router Standards

- Pages are Server Components by default; add `"use client"` only for `useState`, `useEffect`, event handlers, or browser APIs
- Data fetching in Server Components via `async/await` — no `useEffect` fetching
- Layouts define persistent UI; route groups `(auth)`, `(dashboard)` organize without affecting URLs
- Loading states: `loading.tsx`; errors: `error.tsx` (`"use client"` required)
- Client components fetch only on user action (search, filter) — not on mount

---

## Component Architecture

- **Base components** (`components/ui/`) — shadcn/ui primitives, no business logic
- **Form components** (`components/forms/`) — compose base components with validation
- **Feature components** (`components/`) — domain-aware, connected to hooks or services
- **Page components** (`app/.../page.tsx`) — orchestrate feature components; minimal logic

**Rules:**
- One component per file; file name matches component name (PascalCase)
- Props always typed with explicit TypeScript interfaces — no `any`
- Extract repeated UI patterns into reusable components after the second use
- No inline styles; use Tailwind utility classes only
- Avoid prop drilling beyond 2 levels — lift state or use context

---

## TypeScript Standards

- Strict mode enabled in `tsconfig.json`
- All props, hook return values, API responses, and function signatures fully typed
- Types live in `types/<domain>.ts`; import explicitly — no implicit `any`
- Use `interface` for object shapes; `type` for unions, aliases, and mapped types
- API response types mirror backend Pydantic schemas
- Never use `as` casting to suppress errors — fix the type

---

## State Management

- Server state (API data): React Query via custom hooks in `hooks/`
- Local UI state: `useState` / `useReducer` within the component
- Shared UI state (sidebar, active channel): React Context — one context per concern
- No global state library unless React Query + Context proves insufficient

---

## API Integration

- All calls through `lib/api.ts` (base client with auth headers and error handling)
- Domain functions in `services/<domain>Service.ts`; hooks wrap them with React Query
- Never call `fetch` directly in components; always handle loading, error, and empty states

---

## Form Handling

- React Hook Form for all forms; Zod schemas in `lib/validations.ts` shared with API types
- Inline field errors on blur; form-level error on submit failure
- Disable submit + show loading during submission; preserve input on failure

---

## Error Handling

- API errors caught in service layer; surfaced via React Query error state
- `error.tsx` for route-level crashes; toasts for async actions (publish, upload, save)
- Plain language errors only — never raw API strings; distinguish retry vs re-auth errors

---

## Responsive Design

- Mobile-first: base = mobile, `md:` tablet, `lg:` desktop; no horizontal scroll
- Dashboard sidebar collapsible on mobile; all touch targets minimum 44×44px
- Test at 375px · 768px · 1280px

---

## Accessibility

- Semantic HTML first: `<button>`, `<nav>`, `<main>`, `<header>`, `<section>`
- All interactive elements keyboard-navigable with visible focus ring
- Images have descriptive `alt` text; decorative images use `alt=""`
- Form labels explicitly associated with inputs via `htmlFor` / `id`
- Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI components)
- Loading states communicated with `aria-busy`; errors with `role="alert"`

---

## Performance

- `next/image` for all images; `next/dynamic` for heavy components not needed on initial render
- Parallel fetch in Server Components — no `useEffect` waterfalls
- `useMemo` for expensive computations; `useCallback` for stable callbacks; push logic server-side

---

## UI Checklist
- [ ] Mobile-first layout; no horizontal scroll on any breakpoint
- [ ] Loading, error, and empty states handled for all data-dependent UI
- [ ] Toasts used for async feedback (publish, upload, save)
- [ ] Consistent use of shadcn/ui components — no one-off raw HTML equivalents

## Component Checklist
- [ ] Props typed with explicit interface — no `any`
- [ ] `"use client"` added only where interactivity is required
- [ ] No inline styles; Tailwind classes only
- [ ] No prop drilling beyond 2 levels

## Accessibility Checklist
- [ ] Semantic HTML elements used throughout
- [ ] All inputs have associated `<label>` elements
- [ ] Focus ring visible on all interactive elements
- [ ] Error messages use `role="alert"`; loading uses `aria-busy`

## Performance Checklist
- [ ] Images use `next/image`
- [ ] Heavy components lazy-loaded with `next/dynamic`
- [ ] No `useEffect` used for data fetching (use Server Components or React Query)
- [ ] No unnecessary re-renders from unstable prop references
