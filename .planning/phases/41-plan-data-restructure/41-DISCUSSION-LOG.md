# Phase 41: Plan Data Restructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-11
**Areas discussed:** Seeder values & features, Credit sync strategy, Enterprise tier behavior, Trial credit constant

## Q&A

### Seeder Values & Features

**Q1:** Should the feature lists for each tier also change, or just update the credit limits and prices?
- Options: Update features too | Only credits & prices | You decide
- **Selected:** Other — "all features will be available in all the plans only the enterprise plan will have the API which we will implement later on"

**Q2:** What feature bullets should all plans share?
- Options: Keep Pro's list for all | Simplified list | You decide
- **Selected:** Keep Pro's list for all

### Credit Sync Strategy

**Q3:** How should the migration update existing users' credit records?
- Options: Reset to new limit (Recommended) | Proportional adjust | Only update limit field
- **Selected:** Reset to new limit (Recommended)

### Enterprise Tier Behavior

**Q4:** What should Enterprise's credit limit and price be in the seeder?
- Options: Keep 200/day, price 0 | Unlimited credits, price 0 | Keep 200/day, null price
- **Selected:** Keep 200/day, null price

### Trial Credit Constant

**Q5:** Should trial users also get access to all features (like paid plans), or just Threat Search (like Free)?
- Options: All features (Recommended) | Threat Search only
- **Selected:** All features (Recommended)

---

*Discussion completed: 2026-04-11*
