# Phase 6: PostgreSQL Migration - Research

**Researched:** 2026-03-14
**Domain:** Laravel 12 database migration from MySQL to PostgreSQL
**Confidence:** HIGH

## Summary

This phase migrates the AQUA TIP Laravel 12 backend from MySQL to PostgreSQL. The codebase is in good shape for migration: all migrations use Laravel's Schema Builder (no raw MySQL DDL), there is only one `DB::raw()` call (`remaining - 1` arithmetic which is valid in both MySQL and PostgreSQL), and the test suite runs on SQLite in-memory via `phpunit.xml`. The main issues are: (1) the `->after()` column modifier used in 4 migrations is MySQL-only and silently ignored by PostgreSQL (harmless but should be removed for clarity), (2) `mediumText` and `longText` both map to `text` in PostgreSQL (no issue, just different storage), (3) `unsignedTinyInteger` maps to `smallint` in PostgreSQL (no unsigned types exist, but Laravel handles this), and (4) the `use Pdo\Mysql` import in `config/database.php` should be cleaned up since the mysql connection block is no longer the primary driver.

The environment is ready: PHP 8.3.16 has both `pdo_pgsql` and `pgsql` extensions loaded, and Laragon has PostgreSQL 17.2 installed at `C:/laragon/bin/postgresql/postgresql/`. The primary work is: create the PostgreSQL database, update `.env`, remove MySQL-specific `->after()` calls from migrations, run migrations fresh on PostgreSQL, verify all 44+ Pest tests pass, and update `.env.example` for the new defaults.

**Primary recommendation:** Remove `->after()` modifiers from migrations, switch `DB_CONNECTION` to `pgsql`, create the `aqua_tip` database in PostgreSQL, run `php artisan migrate:fresh`, then run the full Pest test suite. Keep tests on SQLite for speed but add a CI/validation step against PostgreSQL.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | All MySQL-specific syntax in migrations replaced with PostgreSQL-compatible equivalents | 4 migrations use `->after()` (MySQL-only, ignored by PG). `mediumText`/`longText`/`unsignedTinyInteger` are handled by Laravel's PG grammar automatically. One `DB::raw('remaining - 1')` is cross-compatible. No raw MySQL DDL found. |
| DB-02 | Laravel `DB_CONNECTION` switched to `pgsql` with PostgreSQL driver configured | `config/database.php` already has `pgsql` connection block. Just needs `.env` update: `DB_CONNECTION=pgsql`, `DB_PORT=5432`, and PostgreSQL credentials. Remove `use Pdo\Mysql` import. |
| DB-03 | All 44+ existing Pest tests pass against PostgreSQL | Tests use `RefreshDatabase` + SQLite in-memory (phpunit.xml). Tests use only Eloquent/query builder, no MySQL-specific assertions. Should pass on both SQLite and PostgreSQL without changes. |
| DB-04 | Local development works with PostgreSQL | Laragon has PostgreSQL 17.2 installed. PHP 8.3.16 has `pdo_pgsql` + `pgsql` extensions. Need to create database and configure `.env`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 17.2 | Primary database | Already installed via Laragon |
| Laravel Framework | 12.x | Application framework | Already in use, has native pgsql support |
| pdo_pgsql | (bundled with PHP 8.3) | PHP PostgreSQL driver | Already loaded in PHP |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pest | 3.8 | Test framework | Already in use for 44+ tests |
| Laragon | (local) | Local dev environment | PostgreSQL 17.2 bundled |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Laragon PostgreSQL | Docker PostgreSQL | Docker adds complexity; Laragon already has PG installed |
| SQLite for tests | PostgreSQL for tests | SQLite is faster for tests; PG more realistic but slower |

**No additional packages needed.** Laravel's built-in PostgreSQL support requires zero extra Composer dependencies.

## Architecture Patterns

### Migration Changes Required

The following MySQL-specific patterns need attention:

#### 1. `->after()` Column Modifier (4 migrations affected)
**What:** `->after('column_name')` specifies column position. MySQL-only feature.
**PostgreSQL behavior:** Silently ignored -- columns appended to end of table.
**Action:** Remove `->after()` calls for cross-database compatibility. Column order does not affect application logic.

Files affected:
- `2026_03_12_154943_add_oauth_columns_to_users_table.php` (3 instances)
- `2026_03_13_000003_add_trial_ends_at_to_users_table.php` (1 instance)
- `2026_03_13_105454_add_phone_and_onboarding_to_users_table.php` (2 instances)

#### 2. `mediumText` / `longText` Column Types
**What:** MySQL has `MEDIUMTEXT` (16MB) and `LONGTEXT` (4GB) as distinct types.
**PostgreSQL behavior:** Laravel maps both to `text` (unlimited length). No action needed.

Files affected:
- `0001_01_01_000001_create_cache_table.php` (`mediumText`)
- `0001_01_01_000002_create_jobs_table.php` (`longText`, `mediumText`)
- `0001_01_01_000000_create_users_table.php` (`longText`)

#### 3. `unsignedTinyInteger`
**What:** MySQL `TINYINT UNSIGNED` (0-255).
**PostgreSQL behavior:** Laravel maps to `smallint` (no unsigned in PG). No action needed -- range is sufficient.

#### 4. `DB::raw('remaining - 1')`
**What:** Atomic decrement in `DeductCredit` middleware.
**PostgreSQL behavior:** Identical SQL arithmetic. No action needed.

#### 5. `use Pdo\Mysql` import in `config/database.php`
**What:** PHP 8.5+ MySQL PDO constant reference. Used only in mysql connection config.
**Action:** Can be removed or guarded since we are switching to pgsql. Not harmful but is dead code.

### .env Configuration Changes
```
# FROM (MySQL)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aqua_tip
DB_USERNAME=root
DB_PASSWORD=

# TO (PostgreSQL)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=aqua_tip
DB_USERNAME=postgres
DB_PASSWORD=
```

### Test Configuration
Current `phpunit.xml` uses SQLite in-memory:
```xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```
This can remain as-is for fast test execution. Tests use only Eloquent/query builder abstractions -- no raw SQL that differs between SQLite and PostgreSQL.

**Recommendation:** Keep SQLite for default test runs (speed). Optionally add a `.env.testing.pgsql` for explicit PostgreSQL validation when needed.

### Anti-Patterns to Avoid
- **Modifying test assertions to match PG quirks:** The tests are database-agnostic. If a test fails, fix the migration or app code, not the test.
- **Using `DB::statement()` with raw PostgreSQL DDL:** Stick to Schema Builder for cross-database compatibility.
- **Forgetting to update `.env.example`:** Other developers need the new defaults.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database creation | SQL scripts | `createdb` CLI or Laragon GUI | Standard PostgreSQL tooling |
| Column type mapping | Manual type conversion | Laravel Schema Builder | Handles MySQL-to-PG translation automatically |
| Migration testing | Custom migration runner | `php artisan migrate:fresh` | Standard Laravel command |
| UUID generation (if needed later) | Custom UUID columns | `$table->uuid()` | Laravel's PG grammar handles this natively |

## Common Pitfalls

### Pitfall 1: Forgetting to Create the PostgreSQL Database
**What goes wrong:** `php artisan migrate` fails with "database does not exist."
**Why it happens:** Unlike MySQL with Laragon, PostgreSQL databases are not auto-created.
**How to avoid:** Run `createdb aqua_tip` or use pgAdmin/Laragon GUI before migrating.
**Warning signs:** `SQLSTATE[08006]` or `FATAL: database "aqua_tip" does not exist`

### Pitfall 2: PostgreSQL Default User/Password
**What goes wrong:** Connection refused or auth failure.
**Why it happens:** Laragon's PostgreSQL default user is `postgres` (not `root`), and may have a password set.
**How to avoid:** Check Laragon PostgreSQL settings. Default is typically `postgres` with empty or `postgres` password.
**Warning signs:** `SQLSTATE[08006]` with "authentication failed"

### Pitfall 3: Case Sensitivity in Table/Column Names
**What goes wrong:** Queries fail if using quoted identifiers with wrong case.
**Why it happens:** PostgreSQL folds unquoted identifiers to lowercase but preserves case in quoted identifiers. MySQL is case-insensitive on Windows.
**How to avoid:** Laravel uses lowercase, unquoted identifiers by default. No action needed unless someone added raw queries with mixed case.
**Warning signs:** `relation "TableName" does not exist`

### Pitfall 4: Boolean Type Differences
**What goes wrong:** Assertions checking for `0`/`1` fail because PostgreSQL uses `true`/`false`.
**Why it happens:** MySQL stores booleans as TINYINT (0/1), PostgreSQL uses native boolean.
**How to avoid:** Laravel's Eloquent casts handle this. If any test explicitly checks for integer 0/1, it may need updating. Current tests do not appear to do this.
**Warning signs:** Test assertions on boolean fields returning unexpected types.

### Pitfall 5: String Concatenation Operator
**What goes wrong:** MySQL uses `CONCAT()`, PostgreSQL uses `||` operator.
**Why it happens:** Different SQL dialects.
**How to avoid:** No raw string concatenation found in codebase. Not a current risk.

### Pitfall 6: `use Pdo\Mysql` Import Error on PHP < 8.5
**What goes wrong:** The `use Pdo\Mysql` import at top of `config/database.php` is a PHP 8.5+ feature for named PDO constants.
**Why it happens:** Laravel 12 ships with this for forward compatibility.
**How to avoid:** This import is only used inside the `mysql` connection config block. Since we are switching to `pgsql`, it is dead code. Can optionally be removed but does not cause errors on PHP 8.3 because the `use` statement is only resolved when the constant is referenced, which only happens when using the mysql driver.
**Warning signs:** None in practice with PHP 8.3 + pgsql driver.

## Code Examples

### Removing `->after()` from a Migration
```php
// BEFORE (MySQL-specific)
Schema::table('users', function (Blueprint $table) {
    $table->string('oauth_provider', 50)->nullable()->after('remember_token');
    $table->string('oauth_id', 255)->nullable()->after('oauth_provider');
    $table->string('avatar_url', 500)->nullable()->after('oauth_id');
});

// AFTER (Cross-database compatible)
Schema::table('users', function (Blueprint $table) {
    $table->string('oauth_provider', 50)->nullable();
    $table->string('oauth_id', 255)->nullable();
    $table->string('avatar_url', 500)->nullable();
});
```

### Creating PostgreSQL Database (Laragon)
```bash
# Option 1: Using createdb CLI
"C:/laragon/bin/postgresql/postgresql/bin/createdb.exe" -U postgres aqua_tip

# Option 2: Using psql
"C:/laragon/bin/postgresql/postgresql/bin/psql.exe" -U postgres -c "CREATE DATABASE aqua_tip;"
```

### Updated .env Configuration
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=aqua_tip
DB_USERNAME=postgres
DB_PASSWORD=
```

### Running Migration and Tests
```bash
cd backend

# Fresh migration on PostgreSQL
php artisan migrate:fresh

# Run all tests (still uses SQLite in-memory per phpunit.xml)
php artisan test

# Optionally run tests against PostgreSQL
DB_CONNECTION=pgsql DB_DATABASE=aqua_tip php artisan test
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MySQL with Laragon default | PostgreSQL for Railway compatibility | v1.1 (now) | Required for Railway deployment |
| `->after()` for column ordering | Omit (PostgreSQL ignores it) | Laravel convention | Cleaner cross-DB migrations |
| `use Pdo\Mysql` in config | Only needed for mysql driver | Laravel 12 | Can remove since switching to pgsql |

**No deprecated features involved.** Laravel 12's PostgreSQL support is mature and fully equivalent to MySQL support.

## Open Questions

1. **Laragon PostgreSQL default credentials**
   - What we know: Laragon installs PostgreSQL 17.2, typically with user `postgres`
   - What's unclear: Whether password is empty, `postgres`, or something else on this install
   - Recommendation: Try empty password first, then `postgres`. Check Laragon settings panel.

2. **Laragon PostgreSQL service status**
   - What we know: PostgreSQL binaries exist at `C:/laragon/bin/postgresql/postgresql/`
   - What's unclear: Whether the PostgreSQL service is currently running in Laragon
   - Recommendation: Enable PostgreSQL in Laragon settings, restart Laragon, verify with `pg_isready`

3. **Test execution strategy**
   - What we know: Tests currently run on SQLite in-memory (fast, isolated)
   - What's unclear: Whether to switch tests to PostgreSQL or keep SQLite
   - Recommendation: Keep SQLite as default for speed. Validate once against PostgreSQL to confirm compatibility. DB-03 requires tests to pass "against PostgreSQL" so at minimum one full run on PG is needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Pest 3.8 (PHPUnit 11.5) |
| Config file | `backend/phpunit.xml` |
| Quick run command | `cd backend && php artisan test` |
| Full suite command | `cd backend && php artisan test --parallel` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | Migrations run cleanly on PostgreSQL | smoke | `cd backend && php artisan migrate:fresh --force` | N/A (artisan command) |
| DB-02 | pgsql driver configured and connects | smoke | `cd backend && php artisan db:show` | N/A (artisan command) |
| DB-03 | All 44+ Pest tests pass | integration | `cd backend && php artisan test` | Existing 44+ tests |
| DB-04 | Local dev works end-to-end | manual-only | Start Laragon with PG, run `php artisan serve`, test endpoint | Manual |

### Sampling Rate
- **Per task commit:** `cd backend && php artisan test`
- **Per wave merge:** `cd backend && php artisan test && php artisan migrate:fresh --force`
- **Phase gate:** Full test suite green + `php artisan migrate:fresh` on PostgreSQL

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. No new test files needed. The 44+ existing Pest tests validate DB-03 directly.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: 9 migration files, `config/database.php`, `phpunit.xml`, `.env`, `composer.json`
- PHP runtime: `php -m` confirms `pdo_pgsql` + `pgsql` loaded
- PostgreSQL binary: `postgres.exe --version` confirms 17.2

### Secondary (MEDIUM confidence)
- Laravel 12 documentation: Schema Builder automatically translates `longText`/`mediumText`/`unsignedTinyInteger` to PostgreSQL equivalents
- Laravel docs: `->after()` is documented as MySQL-only modifier

### Tertiary (LOW confidence)
- Laragon PostgreSQL default credentials (assumed `postgres` with empty password based on standard Laragon behavior)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly verified PHP extensions, PostgreSQL binary, and Laravel config
- Architecture: HIGH - Read every migration file and all app code using DB facades
- Pitfalls: HIGH - Comprehensive grep for MySQL-specific patterns found only `->after()` and type mappings
- Test compatibility: HIGH - All tests use Eloquent/query builder only, no raw MySQL SQL

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- no fast-moving dependencies)
