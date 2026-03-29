---
phase: 32-date-based-news-browsing
plan: 02
status: checkpoint
completed_tasks: 1
total_tasks: 2
started: 2026-03-29
updated: 2026-03-29
---

## Summary

Replaced cursor-based pagination with a date-based calendar navigation system on ThreatNewsPage. Built a custom glassmorphism CalendarDropdown component with prev/next day arrows, full month grid picker, and "Today" shortcut button. Date state is persisted in URL as `?date=YYYY-MM-DD` (clean URL for today). UTC boundary computation uses the user's IANA timezone from AuthContext with browser fallback. Auto-refresh recomputes boundaries on each tick to handle midnight crossover.

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Replace pagination with date selector and calendar dropdown | ✓ Complete |
| 2 | Verify date-based news browsing (human checkpoint) | ○ Pending |

## Key Files

### Modified
- `frontend/src/pages/ThreatNewsPage.jsx` — Complete rewrite of navigation: removed pagination state/handlers/UI, added date helpers (getTodayStr, getUtcBoundaries, getCalendarGrid, formatDisplayDate, formatDateParam), CalendarDropdown component, date URL state management, timezone-aware UTC boundary computation

## Decisions
- Used `Intl.DateTimeFormat('en-CA')` for consistent YYYY-MM-DD formatting across locales
- Calendar grid is always 42 cells (6 weeks) for consistent layout
- Future dates disabled in both day arrows and calendar grid
- Silent refresh recomputes today's boundaries to handle midnight crossover (Pitfall 5)

## Self-Check: PASSED
- [x] getTodayStr, getUtcBoundaries, getCalendarGrid helper functions present
- [x] CalendarDropdown component with glassmorphism styling
- [x] URL date param via useSearchParams
- [x] No PAGE_SIZE, cursorHistory, handleNext/handlePrevious pagination remnants
- [x] useAuth timezone integration with browser fallback
- [x] Calendar icon in lucide-react imports
- [x] Vite build passes
