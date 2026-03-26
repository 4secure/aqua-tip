---
phase: 17-threat-news-ux-polish
verified: 2026-03-19T12:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 17: Threat News UX Polish Verification Report

**Phase Goal:** Replace entity tags with OpenCTI label-based categories, add dynamic category filter dropdown, and move date column to first position
**Verified:** 2026-03-19T12:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/threat-news returns items with `labels` array instead of `related_entities` | VERIFIED | ThreatNewsService.php line 226: `'labels' => $this->flattenLabels(...)`, no `related_entities` or `flattenRelatedEntities` found |
| 2 | GET /api/threat-news?label=id returns only reports matching that label | VERIFIED | ThreatNewsService.php lines 154-161: objectLabel filter via FilterGroup; IndexController.php line 24: `$label = $request->query('label')` passed to service |
| 3 | GET /api/threat-news/labels returns all available labels from OpenCTI | VERIFIED | LabelsController.php calls `ThreatNewsService::labels()`; ThreatNewsService.php lines 58-65 + 179-205: executeLabelsQuery with 15-min cache |
| 4 | Threat News rows show category chips from labels data, not related entities | VERIFIED | ThreatNewsPage.jsx ReportRow (lines 357-404): uses `report.labels`, renders with `categoryColor()`. No entity-related code remains |
| 5 | Category dropdown in toolbar filters reports by label ID via URL param | VERIFIED | ThreatNewsPage.jsx lines 226-241: `<select>` with `value={label}`, populates from `categories` state, calls `updateParam('label', ...)` |
| 6 | Clicking a category chip sets the dropdown filter (synced) | VERIFIED | ThreatNewsPage.jsx lines 151-164: `handleCategoryClick` sets both `categoryFilterName` state and `label` URL param; dropdown reads same `label` param |
| 7 | Date column appears first in each row with time sub-detail | VERIFIED | ThreatNewsPage.jsx lines 366-374: date div is first child with `w-[100px]`, shows `formatDate` + `formatTime` |
| 8 | Detail modal shows all category chips with no overflow cap | VERIFIED | ThreatNewsPage.jsx lines 484-508: modal maps ALL `labels` (no slice), renders under "Categories" heading |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/Services/ThreatNewsService.php` | GraphQL query with objectLabel, flattenLabels, label filter | VERIFIED | Contains `objectLabel` fragment (line 113), `flattenLabels` (line 250), `?string $labelId` param, `'key' => 'objectLabel'` filter, `labels()` and `executeLabelsQuery()` methods. No old entity code remains |
| `backend/app/Http/Controllers/ThreatNews/LabelsController.php` | New controller for labels endpoint | VERIFIED | Contains `class LabelsController extends Controller`, invokes `ThreatNewsService::labels()`, handles OpenCtiConnectionException |
| `backend/app/Http/Controllers/ThreatNews/IndexController.php` | Updated with label param | VERIFIED | Line 24: `$label = $request->query('label')`, passed as 5th arg to `list()` |
| `backend/routes/api.php` | Route registration for labels endpoint | VERIFIED | Import: `use ...LabelsController as ThreatNewsLabelsController`; Route: `Route::get('/threat-news/labels', ThreatNewsLabelsController::class)` |
| `frontend/src/api/threat-news.js` | Label param support and fetchThreatNewsLabels | VERIFIED | `label` in destructured params, `fetchThreatNewsLabels()` exported, calls `/api/threat-news/labels` |
| `frontend/src/pages/ThreatNewsPage.jsx` | Category chips, dropdown, date-first layout | VERIFIED | 543 lines. Contains CATEGORY_COLORS, categoryColor, formatTime, categories state, select dropdown, handleCategoryClick, date-first ReportRow |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| IndexController.php | ThreatNewsService.php | passes label param to list() | WIRED | Line 35: `$label` passed as 5th positional arg |
| LabelsController.php | ThreatNewsService.php | calls labels() method | WIRED | Line 20: `app(ThreatNewsService::class)->labels()` |
| ThreatNewsPage.jsx | threat-news.js | fetchThreatNewsLabels call in useEffect | WIRED | Line 14: import; Lines 80-86: useEffect calls fetchThreatNewsLabels |
| ThreatNewsPage.jsx | /api/threat-news?label= | fetchThreatNews with label param | WIRED | Line 96: `params.label = label`; Line 98: `fetchThreatNews(params)` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SC-1 | 17-01, 17-02 | Categories display from OpenCTI labels | VERIFIED | Backend returns `labels` array; frontend renders category chips with hash-based colors |
| SC-2 | 17-01, 17-02 | Dynamic category filter dropdown synced with chips | VERIFIED | Backend `/labels` endpoint + filter support; frontend select dropdown + handleCategoryClick share `label` URL param |
| SC-3 | 17-02 | Date column first with time sub-detail | VERIFIED | ReportRow renders date div as first child with formatDate + formatTime |

Note: SC-1, SC-2, SC-3 are Success Criteria from ROADMAP.md, not formal entries in REQUIREMENTS.md. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | - |

No TODO, FIXME, PLACEHOLDER, stub returns, or console.log-only implementations found in any modified files.

### Human Verification Required

### 1. Category Chips Visual Appearance

**Test:** Open Threat News page with live data, verify category chips render with correct colors and text
**Expected:** Each label shows as a colored rounded chip; colors are consistent for same label values across rows
**Why human:** Visual rendering, color contrast, and readability cannot be verified programmatically

### 2. Category Dropdown Filter End-to-End

**Test:** Select a category from the dropdown, verify list updates; click a category chip in a row, verify dropdown value syncs
**Expected:** Both actions filter the list identically and keep dropdown + banner in sync
**Why human:** Requires live API connection and observable UI state synchronization

### 3. Date Column Layout

**Test:** View the report list and confirm date appears as the leftmost column with time below
**Expected:** Date in "Mon DD, YYYY" format with 24h time underneath, consistent 100px width
**Why human:** Layout rendering, alignment, and responsive behavior need visual confirmation

### Gaps Summary

No gaps found. All 8 observable truths verified. All artifacts exist, are substantive, and are properly wired. Backend GraphQL query uses objectLabel instead of objects, label filtering works via FilterGroup, labels endpoint is registered and cached. Frontend displays category chips from labels data, has a synced dropdown filter, and renders date as the first column with time sub-detail. All old entity-related code has been removed from both backend and frontend.

---

_Verified: 2026-03-19T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
