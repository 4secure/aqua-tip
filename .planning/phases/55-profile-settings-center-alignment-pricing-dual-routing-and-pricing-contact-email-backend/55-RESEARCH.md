# Phase 55: Pricing & Enterprise - Research

**Researched:** 2026-04-14
**Domain:** Auth-aware dual routing + Laravel Mail enterprise contact endpoint
**Confidence:** HIGH

## Summary

This phase wires the existing PricingPage to render conditionally based on authentication state (inside AppLayout with sidebar when logged in, standalone with its own navbar when not) and replaces the placeholder contact form submission with a real Laravel Mail backend endpoint.

The codebase already has all the frontend components built (PricingPage, PlanCard, PlanContactModal) and working mail infrastructure (SMTP configured, VerifyEmailWithCode notification as pattern reference). The work is primarily routing restructure in App.jsx and a new backend controller + Mailable class.

**Primary recommendation:** Use a single `/pricing` route that conditionally wraps in AppLayout based on auth state, and create a standalone Laravel Mailable (not Notification) for the enterprise contact email since it targets the admin, not a user model.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Backend endpoint receives contact form submissions and sends email notification via Laravel Mail
- **D-02:** Recipient address comes from `ADMIN_EMAIL` in `.env` -- configurable per environment without code changes
- **D-03:** Email body includes full form data (name, email, message, plan name) PLUS authenticated user context if logged in (current plan slug, trial status, usage stats)
- **D-04:** Frontend `PlanContactModal` wires its `handleSubmit` to the new backend endpoint instead of the fake 1-second delay
- **D-05:** Single `/pricing` route in App.jsx with conditional wrapper -- render inside `AppLayout` when user is authenticated, standalone (with its own navbar) when not. PricingPage checks auth context to hide/show its built-in navbar.
- **D-06:** Authenticated user's current plan card shows a "Current Plan" badge and its CTA button is disabled. PlanCard already receives `currentPlanSlug` -- extend it with visual badge.
- **D-07:** Keep the existing navbar in PricingPage.jsx as-is for unauthenticated users. Logo already links to `/` (satisfies PRICE-04).

### Claude's Discretion
- Email validation rules on the backend endpoint (standard Laravel validation)
- Error handling for mail delivery failures (queue vs sync, retry logic)
- Exact "Current Plan" badge styling (should follow existing design system tokens)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRICE-01 | Pricing page renders inside AppLayout (with sidebar) when user is authenticated | D-05: Conditional wrapper pattern in App.jsx using auth state |
| PRICE-02 | Pricing page renders standalone (no sidebar) when user is unauthenticated | D-05 + D-07: PricingPage already has its own navbar, conditionally show/hide it |
| PRICE-03 | Enterprise contact form submits to backend endpoint and sends email notification | D-01 through D-04: New Laravel controller + Mailable, wire PlanContactModal |
| PRICE-04 | Topbar icon navigates to landing page when viewing pricing as unauthenticated user | D-07: Already satisfied -- PricingPage navbar logo links to `/` |
</phase_requirements>

## Architecture Patterns

### Pattern 1: Conditional Layout Wrapper in App.jsx
**What:** A wrapper component that checks auth state and either renders children inside AppLayout or standalone.
**When to use:** When the same page needs different layouts based on auth state.

The current App.jsx has `/pricing` as a standalone route (line 57). The change moves it into a conditional wrapper component.

**Approach:**
```jsx
// New component: ConditionalAppLayout
// If user is authenticated, render inside AppLayout (sidebar + topbar)
// If not, render children directly (standalone)
function ConditionalAppLayout() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) return <AppLayout />;

  // Standalone -- just render the child route
  return <Outlet />;
}
```

This component wraps the `/pricing` route in App.jsx. PricingPage then checks `useAuth()` to decide whether to show its built-in navbar (only when unauthenticated, since AppLayout provides its own topbar). [VERIFIED: codebase inspection of App.jsx, AppLayout.jsx, PricingPage.jsx]

### Pattern 2: Laravel Mailable for Admin Notification
**What:** A `Mailable` class (not `Notification`) that sends the contact form data to the admin email.
**Why Mailable over Notification:** Notifications target a `Notifiable` model (typically User). The enterprise contact email goes to `ADMIN_EMAIL` from `.env` -- there may not be an admin User model instance. `Mail::to(config('app.admin_email'))` is cleaner. [VERIFIED: Laravel Notification pattern in VerifyEmailWithCode.php targets `$notifiable` user object]

**Approach:**
```php
// app/Mail/EnterpriseContactMail.php
class EnterpriseContactMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $contactData
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            to: [config('app.admin_email')],
            subject: "Enterprise Inquiry: {$this->contactData['plan_name']}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.enterprise-contact',
        );
    }
}
```

### Pattern 3: Controller with Optional Auth
**What:** The contact endpoint should NOT require authentication (unauthenticated users on pricing page should be able to submit too), but should include auth context when available.
**How:** Use `auth:sanctum` as optional middleware or check `$request->user()` which returns null for guests. [VERIFIED: apiClient sends `credentials: 'include'` so Sanctum cookies are always sent]

```php
// Controller checks optional auth
$user = $request->user(); // null for guests, User for authenticated
$contactData = [
    'name' => $validated['name'],
    'email' => $validated['email'],
    'message' => $validated['message'],
    'plan_name' => $validated['plan_name'],
    // Include user context only when authenticated
    'user_plan' => $user?->plan?->slug,
    'trial_active' => $user?->trial_active,
    'user_email' => $user?->email,
];
```

### Recommended File Structure
```
backend/
  app/
    Http/Controllers/Enterprise/
      ContactController.php          # New: handles POST /api/enterprise/contact
    Mail/
      EnterpriseContactMail.php      # New: Mailable class
  resources/views/mail/
    enterprise-contact.blade.php     # New: Email template (markdown)

frontend/src/
  components/pricing/
    PlanConfirmModal.jsx             # Modified: wire handleSubmit to apiClient.post
  pages/
    PricingPage.jsx                  # Modified: conditionally hide navbar
  App.jsx                           # Modified: conditional layout wrapper for /pricing
```

### Anti-Patterns to Avoid
- **Creating a separate /app/pricing route:** D-05 explicitly says single `/pricing` route with conditional wrapper. Two routes would create URL confusion and break shared links.
- **Using Notification class for admin email:** The admin is not a `Notifiable` model instance in this system. Use `Mail::send()` with a `Mailable` class directly.
- **Requiring auth for the contact endpoint:** Unauthenticated users on the pricing page must also be able to submit the contact form.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Raw SMTP/PHPMailer | Laravel `Mail::send()` with Mailable class | Already configured, handles retries, queue support |
| Email templates | HTML string concatenation | Blade markdown mail templates | Laravel's `mail.markdown` layout gives consistent styling |
| Form validation | Manual if/else checks | Laravel `$request->validate()` | Consistent error format, auto 422 response |
| CSRF protection | Manual token management | Sanctum's XSRF-TOKEN cookie | Already wired in apiClient.js |

## Common Pitfalls

### Pitfall 1: AppLayout Rendering for Guests
**What goes wrong:** AppLayout has `const { loading } = useAuth()` and renders `LoadingScreen` while auth check runs. A guest hitting `/pricing` would see a brief loading flash.
**Why it happens:** AuthContext always calls `fetchCurrentUser` on mount, which returns 401 for guests.
**How to avoid:** The `ConditionalAppLayout` wrapper handles this -- it checks `loading` state and only renders `AppLayout` when user is authenticated. When `user` is null after loading completes, it renders the standalone page directly via `<Outlet />`.
**Warning signs:** Flash of loading screen on public pricing page.

### Pitfall 2: CSRF Token for Unauthenticated POST
**What goes wrong:** The apiClient sends XSRF-TOKEN cookie for CSRF protection. Unauthenticated users may not have this cookie if they haven't visited any page that triggers Sanctum's CSRF cookie.
**Why it happens:** The CSRF cookie is set by `GET /sanctum/csrf-cookie`. The existing `csrfCookie()` function in `client.js` does this, but it may not be called before the contact form submission.
**How to avoid:** Either (a) call `csrfCookie()` before the POST in `handleSubmit`, or (b) exempt the contact endpoint from CSRF verification since it's a public form with its own rate limiting. Option (a) is safer and follows existing patterns.
**Warning signs:** 419 status code on form submission for guests.

### Pitfall 3: Mail Delivery Blocking Response
**What goes wrong:** Synchronous `Mail::send()` blocks the HTTP response until the email is delivered, causing slow UX.
**Why it happens:** Default Laravel mail is synchronous.
**How to avoid:** For now, synchronous is acceptable -- the contact form shows a success state immediately via frontend optimistic UI. If queue infrastructure exists, use `Mail::queue()` instead. Check if Laravel queue is configured.
**Warning signs:** 2-5 second response time on the contact endpoint.

### Pitfall 4: PlanCard "Current Plan" Badge vs Existing chip-cyan
**What goes wrong:** The PlanCard already shows "Current Plan" as a `chip chip-cyan` span when `isCurrent` is true (line 121). D-06 says "extend with visual badge" but the existing implementation already handles this.
**Why it happens:** D-06 was written before seeing the actual code.
**How to avoid:** Verify the existing `isCurrent` rendering in PlanCard. It already shows "Current Plan" chip and hides the CTA button. D-06 may require no additional work beyond verifying this is sufficient.
**Warning signs:** Duplicate "Current Plan" indicators.

## Code Examples

### Frontend: PricingPage Conditional Navbar
```jsx
// Source: Codebase inspection of PricingPage.jsx
// The navbar (lines 65-97) should only render when user is NOT authenticated
export default function PricingPage() {
  const { user } = useAuth();
  // ... existing state ...

  return (
    <div className="min-h-screen bg-primary">
      {/* Only show standalone navbar when not in AppLayout */}
      {!user && (
        <nav className="sticky top-0 z-50 ...">
          {/* existing navbar content */}
        </nav>
      )}
      {/* rest of page content */}
    </div>
  );
}
```

### Backend: Contact Controller
```php
// Source: Follows pattern from PlanSelectionController.php
class ContactController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'message' => 'nullable|string|max:2000',
            'plan_name' => 'required|string|max:100',
        ]);

        $user = $request->user();

        $contactData = [
            ...$validated,
            'user_plan' => $user?->plan?->slug,
            'trial_active' => $user?->trial_active ?? false,
            'user_email' => $user?->email,
        ];

        Mail::send(new EnterpriseContactMail($contactData));

        return response()->json(['message' => 'Message sent successfully']);
    }
}
```

### Backend: Route Registration
```php
// In routes/api.php -- public endpoint with rate limiting
// Place OUTSIDE the auth:sanctum group but use optional auth
Route::post('/enterprise/contact', \App\Http\Controllers\Enterprise\ContactController::class)
    ->middleware('throttle:5,1'); // 5 per minute to prevent spam
```

### Frontend: PlanContactModal Submit Wiring
```jsx
// Source: PlanConfirmModal.jsx handleSubmit replacement
const handleSubmit = async (e) => {
  e.preventDefault();
  setSending(true);
  try {
    await csrfCookie(); // Ensure CSRF token exists
    await apiClient.post('/api/enterprise/contact', {
      ...form,
      plan_name: planName,
    });
    setSent(true);
  } catch (err) {
    // Show error to user
    setError(err.message || 'Failed to send message');
  } finally {
    setSending(false);
  }
};
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- CLAUDE.md states "No tests exist" |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRICE-01 | Pricing inside AppLayout when authenticated | manual | Visual verification in browser | N/A |
| PRICE-02 | Pricing standalone when unauthenticated | manual | Visual verification in browser | N/A |
| PRICE-03 | Contact form submits and sends email | manual | `curl -X POST /api/enterprise/contact` | N/A |
| PRICE-04 | Logo links to landing page | manual | Already works per D-07 | N/A |

### Wave 0 Gaps
No test infrastructure exists. All verification is manual for this project.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- endpoint is public |
| V3 Session Management | no | N/A |
| V4 Access Control | no | Public endpoint, optional auth context |
| V5 Input Validation | yes | Laravel `$request->validate()` with strict rules |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Contact form spam | Denial of Service | Rate limiting (`throttle:5,1`) |
| XSS in email body | Tampering | Blade template auto-escapes `{{ }}` output |
| Email header injection | Tampering | Laravel Mail sanitizes addresses; validate email format |
| CSRF on POST endpoint | Tampering | Sanctum XSRF-TOKEN cookie (call `csrfCookie()` before POST) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Laravel queue is not configured (sync mail is acceptable) | Pitfall 3 | Slow response if SMTP server is slow; easily fixed later with `Mail::queue()` |
| A2 | No admin User model exists for Notification routing | Pattern 2 | If admin User exists, could use Notification instead; Mailable works regardless |

## Open Questions

1. **Queue configuration**
   - What we know: Mail is configured as SMTP in `.env`. No evidence of queue driver being set up.
   - What's unclear: Whether `QUEUE_CONNECTION` is set to anything other than `sync`.
   - Recommendation: Use synchronous `Mail::send()` for now. The contact form is low-volume. Can switch to `Mail::queue()` later.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| SMTP server | Email delivery | Yes | Contabo SMTP configured in .env | -- |
| Laravel Mail | Mailable class | Yes | Built into Laravel 11 | -- |
| Sanctum | CSRF + optional auth | Yes | Already configured | -- |

**Missing dependencies with no fallback:** None.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `App.jsx`, `PricingPage.jsx`, `PlanCard.jsx`, `PlanConfirmModal.jsx`, `AppLayout.jsx`, `AuthContext.jsx`
- Codebase inspection: `api.php`, `PlanSelectionController.php`, `VerifyEmailWithCode.php`
- Codebase inspection: `backend/.env` MAIL_* configuration, `config/mail.php`
- Codebase inspection: `frontend/src/api/client.js` for apiClient patterns

### Secondary (MEDIUM confidence)
- Laravel 11 Mail documentation patterns (Mailable vs Notification) [ASSUMED based on training data, consistent with codebase patterns]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- patterns verified against existing codebase code
- Pitfalls: HIGH -- identified from actual code inspection (CSRF, loading states, existing badge)

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable -- no external dependency changes expected)
