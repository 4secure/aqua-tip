# Phase 26: Remove raw tab from threat search frontend - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove the "Raw" JSON debug tab from the Threat Search results page. This is a cleanup task — the raw tab exposes unformatted API response data that end users don't need. Raw data remains accessible via browser DevTools for developers.

</domain>

<decisions>
## Implementation Decisions

### Removal scope
- **D-01:** Full deletion of the RawTab component, its tab entry in the tabs memo, and the rendering conditional. No dev flag or alternative access mechanism.
- **D-02:** Clean up unused imports left behind after removal (specifically the `Code` icon from lucide-react if no longer referenced elsewhere).

### Claude's Discretion
- Verify whether `Code` icon is used elsewhere before removing the import
- Any minor formatting cleanup in surrounding code if removal leaves awkward spacing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above.

### Source file
- `frontend/src/pages/ThreatSearchPage.jsx` — Contains the RawTab component (lines 404-412), tab entry (line 554), and tab rendering (line 846)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No reusable assets needed — this is a removal task

### Established Patterns
- Tab system uses `useMemo` to build tab array conditionally based on available data (lines 525-556)
- Each tab has a `{ key, label, icon }` shape
- Tab rendering uses `activeTab === 'key'` conditionals in JSX

### Integration Points
- `ThreatSearchPage.jsx` is the only file affected
- No backend changes needed
- No other components reference `RawTab`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward removal of dead UI.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-remove-raw-tab-from-threat-search-frontend*
*Context gathered: 2026-03-24*
