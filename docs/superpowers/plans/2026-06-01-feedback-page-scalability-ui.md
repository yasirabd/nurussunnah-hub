# Feedback Page Scalability UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Feedback Rekan compact and scalable for many employees.

**Architecture:** Keep Supabase RPC loading in the server page. Move only peer-target navigation into a focused client carousel component. Use URL query params for unit filters and pagination in monitoring/admin tables.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui components, lucide-react.

---

### Task 1: Client Carousel

**Files:**
- Create: `src/app/dashboard/feedback/feedback-target-carousel.tsx`
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] Create a client component that accepts targets and academic year id, keeps an active index, renders one `FeedbackTargetCard` form, exposes previous/next buttons, and offers a select jump list.

- [ ] Move `FeedbackTargetCard` into the client file so the server page can import `FeedbackTargetCarousel` only.

- [ ] Preserve form field names: `academic_year_id`, `receiver_user_id`, `rating`, `feedback_text`.

### Task 2: Server Filtering And Pagination

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] Parse `monitorUnit`, `monitorPage`, `identifiedUnit`, and `identifiedPage` from `searchParams`.

- [ ] Derive unit options from existing rows and filter by selected unit code/name key.

- [ ] Slice filtered arrays with page size 10 and render pagination controls through links that preserve the other table state.

### Task 3: Compact Admin Sections

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] Replace individual Pengingat Feedback badges with unit progress summaries.

- [ ] Wrap admin tables with `overflow-x-auto` and add result counts, empty states, and filter reset links.

### Task 4: Feedback Masuk Compact List

**Files:**
- Modify: `src/app/dashboard/feedback/page.tsx`

- [ ] Add a bounded internal scroll area to the received feedback list.

- [ ] Keep anonymous display and existing rating/date/text content.

### Task 5: Verification

**Files:**
- Verify only.

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Inspect `git diff --check`.

