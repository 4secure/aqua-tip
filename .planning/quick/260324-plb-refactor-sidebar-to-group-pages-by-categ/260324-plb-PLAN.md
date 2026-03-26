---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/data/mock-data.js
  - frontend/src/components/layout/Sidebar.jsx
autonomous: true
must_haves:
  truths:
    - "Sidebar nav items are visually grouped under category headings"
    - "Categories collapse/expand independently when sidebar is expanded"
    - "Collapsed sidebar shows only icons without category headers"
    - "Hover-expand on collapsed sidebar reveals categories and labels"
    - "Active route highlighting still works within grouped categories"
    - "Locked (unauthenticated) items still show lock icon and redirect to login"
  artifacts:
    - path: "frontend/src/data/mock-data.js"
      provides: "NAV_ITEMS restructured with category grouping"
      contains: "category"
    - path: "frontend/src/components/layout/Sidebar.jsx"
      provides: "Category-grouped navigation rendering"
      contains: "category"
  key_links:
    - from: "frontend/src/components/layout/Sidebar.jsx"
      to: "frontend/src/data/mock-data.js"
      via: "NAV_ITEMS import with category structure"
      pattern: "NAV_ITEMS"
---

<objective>
Refactor the sidebar navigation to group pages by logical categories instead of rendering a flat list.

Purpose: Improve navigation UX by organizing 7+ nav items into meaningful groups (e.g., "Intelligence", "Monitoring", "Account") so users can find pages faster as the app grows.

Output: Sidebar with collapsible category sections, each containing related nav items.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/data/mock-data.js (NAV_ITEMS definition — lines 144-152)
@frontend/src/components/layout/Sidebar.jsx (current flat nav rendering)
@frontend/src/App.jsx (route structure for reference)
@CLAUDE.md (design system tokens and patterns)

<interfaces>
From frontend/src/data/mock-data.js:
```javascript
// Current flat structure
export const NAV_ITEMS = Object.freeze([
  { label: 'Dashboard', icon: 'dashboard', href: '/dashboard', public: false },
  { label: 'Threat Search', icon: 'search', href: '/threat-search', public: true },
  { label: 'Threat Map', icon: 'globe', href: '/threat-map', public: false },
  { label: 'Dark Web', icon: 'incognito', href: '/dark-web', public: false },
  { label: 'Threat Actors', icon: 'users', href: '/threat-actors', public: false },
  { label: 'Threat News', icon: 'rss', href: '/threat-news', public: false },
  { label: 'Pricing', icon: 'pricing', href: '/pricing', public: true },
]);
```

From frontend/src/components/layout/Sidebar.jsx:
```javascript
// Key props and state
export default function Sidebar({ collapsed, toggle, mobileOpen, setMobileOpen })
const showLabels = !collapsed || hovered;
// Uses: NavLink, Icon, Lock, useAuth, useNavigate
// Settings section is separate (lines 148-192) — do NOT modify
// Credit badge section (lines 196-205) — do NOT modify
// Collapse toggle (lines 208-218) — do NOT modify
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restructure NAV_ITEMS with category grouping</name>
  <files>frontend/src/data/mock-data.js</files>
  <action>
Replace the flat NAV_ITEMS array with a NAV_CATEGORIES array that groups items by category. Use these groupings:

```javascript
export const NAV_CATEGORIES = Object.freeze([
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'dashboard', href: '/dashboard', public: false },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Threat Search', icon: 'search', href: '/threat-search', public: true },
      { label: 'Threat Actors', icon: 'users', href: '/threat-actors', public: false },
      { label: 'Threat News', icon: 'rss', href: '/threat-news', public: false },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Threat Map', icon: 'globe', href: '/threat-map', public: false },
      { label: 'Dark Web', icon: 'incognito', href: '/dark-web', public: false },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Pricing', icon: 'pricing', href: '/pricing', public: true },
    ],
  },
]);
```

Also keep the old NAV_ITEMS export as a flat derived array for backward compatibility in case anything else imports it:
```javascript
export const NAV_ITEMS = Object.freeze(NAV_CATEGORIES.flatMap(c => c.items));
```

Ensure Object.freeze is applied to prevent mutation. Do NOT modify any other exports in mock-data.js.
  </action>
  <verify>
    <automated>cd C:/laragon/www/aqua-tip/frontend && node -e "const { NAV_CATEGORIES, NAV_ITEMS } = require('./src/data/mock-data.js'); console.log('categories:', NAV_CATEGORIES.length); console.log('flat items:', NAV_ITEMS.length);" 2>/dev/null || echo "ESM - verify via build"; npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>NAV_CATEGORIES exported with 4 categories containing all 7 nav items. NAV_ITEMS still exported as flat array for backward compat. Build succeeds.</done>
</task>

<task type="auto">
  <name>Task 2: Render grouped categories in Sidebar with collapsible sections</name>
  <files>frontend/src/components/layout/Sidebar.jsx</files>
  <action>
Refactor the nav section (lines 95-145) of Sidebar.jsx to render categories from NAV_CATEGORIES instead of flat NAV_ITEMS.

1. Update import: change `NAV_ITEMS` to `NAV_CATEGORIES` from mock-data.js.

2. Add state for open categories — default ALL open:
```javascript
const [openCategories, setOpenCategories] = useState(() =>
  Object.fromEntries(NAV_CATEGORIES.map(c => [c.label, true]))
);
const toggleCategory = useCallback((label) => {
  setOpenCategories(prev => ({ ...prev, [label]: !prev[label] }));
}, []);
```

3. Replace the nav content (the `<div className="space-y-0.5">` block) with category-grouped rendering:

For each category in NAV_CATEGORIES:
- When `showLabels` is true: render a category header row with the category label (uppercase, text-[10px], text-text-muted, tracking-widest, font-mono) and a ChevronDown/ChevronRight toggle icon. The header is a button that calls toggleCategory. Below it, if the category is open, render its items using the exact same NavLink/button markup that exists today (preserve active styles, lock icon behavior, all class names).
- When `showLabels` is false (collapsed, not hovered): skip category headers entirely, render all items as icon-only (same as current collapsed behavior — just the icon, no label, no category header).

Category header styling:
```
px-4 py-1.5 mx-2 flex items-center justify-between cursor-pointer
text-[10px] uppercase tracking-widest font-mono text-text-muted
hover:text-text-secondary transition-colors
```

Add `mb-1` spacing between categories (not between items within a category). Keep `space-y-0.5` for items within each category.

Do NOT modify:
- The logo section (lines 79-92)
- The Settings section (lines 147-192) — it already handles its own expand/collapse
- The CreditBadge section (lines 195-205)
- The collapse toggle (lines 207-218)
- The mobile backdrop or close button
- The hover expand/collapse logic

Keep all existing imports that are still used. Remove NAV_ITEMS import only if fully replaced.
  </action>
  <verify>
    <automated>cd C:/laragon/www/aqua-tip/frontend && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>Sidebar renders nav items grouped under "Overview", "Intelligence", "Monitoring", "Account" category headings. Categories are collapsible via chevron toggle. Collapsed sidebar shows only icons without headers. Active route highlighting preserved. Lock icon behavior for unauthenticated items preserved. Build succeeds with no errors.</done>
</task>

</tasks>

<verification>
1. `npm run build` passes with zero errors
2. Visual check: sidebar shows category headings in expanded state
3. Visual check: clicking a category header collapses/expands its items
4. Visual check: collapsed sidebar shows only icons (no category headers)
5. Visual check: hovering collapsed sidebar reveals categories + labels
6. Active NavLink styling (violet highlight) still works
7. Locked items still show lock icon and redirect to /login on click
</verification>

<success_criteria>
- Sidebar groups 7 nav items into 4 categories with visible headings
- Categories independently collapse/expand
- Collapsed sidebar behavior unchanged (icon-only, no category text)
- All existing nav functionality preserved (active states, auth gating, mobile)
- Production build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/260324-plb-refactor-sidebar-to-group-pages-by-categ/260324-plb-SUMMARY.md`
</output>
