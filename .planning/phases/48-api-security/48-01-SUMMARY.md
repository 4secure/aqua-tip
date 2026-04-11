---
phase: 48-api-security
plan: 01
subsystem: backend-security
tags: [idor, authorization, dark-web, ownership]
dependency_graph:
  requires: []
  provides: [dark-web-task-ownership, idor-protection]
  affects: [SearchController, DarkWebTask]
tech_stack:
  added: []
  patterns: [ownership-table, authorization-check]
key_files:
  created:
    - backend/database/migrations/2026_04_12_000001_create_dark_web_tasks_table.php
    - backend/app/Models/DarkWebTask.php
    - backend/tests/Feature/DarkWeb/DarkWebOwnershipTest.php
  modified:
    - backend/app/Http/Controllers/DarkWeb/SearchController.php
decisions:
  - Return 403 (not 404) for both non-owner and unknown task cases to prevent enumeration
  - Use firstOrCreate to handle duplicate task_id gracefully
requirements-completed: [API-01]
metrics:
  duration: 18min
  completed: "2026-04-11"
  tasks: 2
  files: 4
---

# Phase 48 Plan 01: IDOR Protection Summary

**Dark web task ownership enforcement — prevents unauthorized access to other users' search results via task ID guessing**

## Accomplishments
- Created `dark_web_tasks` migration with user_id foreign key and unique task_id
- Created `DarkWebTask` Eloquent model with user relationship
- Modified `SearchController::__invoke` to store task ownership via `DarkWebTask::firstOrCreate`
- Modified `SearchController::status` to check ownership before returning results — returns 403 for non-owners and unknown tasks
- Created Pest tests verifying: owner gets 200, non-owner gets 403, unknown task gets 403, unauthenticated gets 401

## Task Commits

1. **Task 1: Create DarkWebTask model, migration, and ownership tests** - `1ec4d73` (test)
2. **Task 2: Add ownership enforcement to DarkWeb SearchController** - `166598b` (feat)

## Deviations from Plan

None — plan executed as written.

## Self-Check: PASSED
