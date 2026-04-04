# Phase 32: Date-Based News Browsing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 32-date-based-news-browsing
**Areas discussed:** Date selector UX, Pagination removal, Timezone conversion, URL structure

---

## Date Selector UX

### Q1: Date picker style

| Option | Description | Selected |
|--------|-------------|----------|
| Native date input | HTML `<input type="date">` — zero deps, OS-native look, styled to match dark theme | |
| Custom calendar dropdown | Glassmorphism calendar popup with month navigation, matches design system | ✓ |
| Horizontal date strip | Scrollable row of recent dates (week view), quick but limited range | |

**User's choice:** Custom calendar dropdown
**Notes:** User wants design system consistency over simplicity.

### Q2: Toolbar placement

| Option | Description | Selected |
|--------|-------------|----------|
| Replace pagination area | Date picker goes where prev/next + counter are (right side of toolbar) | ✓ |
| Between search and category | Middle of the toolbar | |
| Above the toolbar | Separate row, more prominent | |

**User's choice:** Replace pagination area
**Notes:** Clean swap — pagination is being removed anyway.

### Q3: Navigation arrows

| Option | Description | Selected |
|--------|-------------|----------|
| Prev/next arrows + calendar button | ChevronLeft/Right to step one day, calendar icon opens picker | ✓ |
| Calendar only | Just the dropdown, no day stepping | |

**User's choice:** Yes, prev/next arrows + calendar button

### Q4: Today quick-action

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, a Today button | Small text button appears when viewing non-today date | ✓ |
| No, arrows are enough | User navigates back manually | |

**User's choice:** Yes, a Today button

---

## Pagination Removal

### Q1: Overflow handling for dates with many reports

| Option | Description | Selected |
|--------|-------------|----------|
| Load all for the date | Fetch all reports in one request, daily volume is manageable | ✓ |
| Scroll pagination within date | Keep cursor pagination scoped to selected date, 20 at a time | |
| Infinite scroll within date | Auto-load more on scroll, filtered to date | |

**User's choice:** Load all for the date
**Notes:** Daily volume (tens to low hundreds) doesn't warrant pagination.

### Q2: Search and category filter alongside date

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both active | Search + category + date all work together | ✓ |
| Remove search, keep category | Date + category is primary UX | |
| Remove both, date only | Single-dimension browsing | |

**User's choice:** Keep both active

---

## Timezone Conversion

### Q1: Who converts date to UTC range

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend sends UTC range | Frontend computes start/end UTC from user's IANA timezone | ✓ |
| Backend converts | Frontend sends date + timezone, backend computes | |
| You decide | Claude picks | |

**User's choice:** Frontend sends UTC range
**Notes:** Backend just passes through to OpenCTI filter.

### Q2: Guest timezone default

| Option | Description | Selected |
|--------|-------------|----------|
| Browser timezone | `Intl.DateTimeFormat().resolvedOptions().timeZone` | ✓ |
| UTC | Default to UTC for guests | |

**User's choice:** Browser timezone

---

## URL Structure

### Q1: Date URL format

| Option | Description | Selected |
|--------|-------------|----------|
| Query param ?date=2026-03-29 | Consistent with existing ?search= and ?label= | ✓ |
| Path segment /threat-news/2026-03-29 | Cleaner URL, requires route changes | |
| You decide | Claude picks based on existing patterns | |

**User's choice:** Query param ?date=2026-03-29

### Q2: Default when no date param

| Option | Description | Selected |
|--------|-------------|----------|
| Default to today | No param = today's news, matches NEWS-02 | ✓ |
| Show all recent | No param = current behavior (latest regardless of date) | |

**User's choice:** Default to today

---

## Claude's Discretion

- Calendar component internals (month navigation, year selection, animation)
- Backend query parameter naming
- ThreatNewsService adaptation approach
- Whether calendar is reusable or page-specific
- Auto-refresh + date selection interaction
- Date-specific empty state messaging

## Deferred Ideas

None — discussion stayed within phase scope
