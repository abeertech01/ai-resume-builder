# Plan: OAuth Sign-up / Log-in (Google + GitHub)

Branch: `feat/oauth` (off `dev`)

## Goal

A visitor can sign up or log in with **Google** or **GitHub** in one click.
Email/password stays exactly as it is. Both paths end the same way: a row in
`Session`, the same `session` cookie, a redirect to `/resumes`.

Built bare-metal, like the rest of auth (no Auth.js / NextAuth): OAuth 2.0
authorization-code flow + PKCE + `state`, hand-written with `fetch`. The point
is being able to answer "walk me through what happens when someone clicks
Continue with Google" without saying "the library does it".

## Where we are today

What already works in our favour:

- `src/features/auth/session.ts` — `createSession(userId)` + `setSessionCookie()`
  don't care *how* the user proved who they are. OAuth only replaces the
  "verify password" step; the session layer is reused untouched.
- Landing page, navbar, `/sign-in` and `/sign-up` already exist, and every
  login/signup path already redirects to `/resumes`, where `LocalResumeSync`
  imports the anonymous resume from `localStorage`. An OAuth round-trip returns
  to the same origin, so that keeps working without new code.
- `User.firstName`, `lastName`, `imageUrl` are already nullable columns.
  `Navbar.tsx` already copes with missing names (falls back to the email).
- `checkRateLimit()` (`src/features/auth/rateLimit.ts`) is reusable as is.
- `NEXT_PUBLIC_BASE_URL` already exists and is validated in `src/env.ts` —
  that's what the redirect URI will be built from.

What OAuth breaks or forces us to decide (none of this is in the code yet):

- `User.passwordHash` is `String` (required, `prisma/schema.prisma:16`). An
  OAuth-only user has no password. Uses that need care:
  - `logIn` — `actions.ts:80` already does `?? dummyPasswordHash`, so it works
    at runtime; only the type changes.
  - **`deleteAccount` — `actions.ts:110-113` verifies the password. An
    OAuth-only user can never pass this. Needs a different confirmation.**
- There is no place to store "this user is Google user `sub=1234`". Email can't
  be the identity — it can change at the provider.
- `emailVerified` exists but is never set or read anywhere. Password signup
  doesn't verify email. That makes **account linking by email unsafe by
  default** (see "Account-linking policy" below) — the most important design
  decision in this plan.
- `middleware.ts` redirects any request without a session cookie to
  `/sign-in`, and `/api/*` is inside the matcher. The provider's redirect back
  to us arrives with no session cookie, so **`/api/auth` must be added to
  `publicRoutes` or the callback will silently bounce to `/sign-in`.**
- `signUp` doesn't lowercase emails (`actions.ts:30`), and lookups are
  case-sensitive. Harmless today; with OAuth in the mix, `Foo@x.com` (password)
  and `foo@x.com` (Google) would become two accounts. Needs normalizing first.
- The database is **shared** between local dev, `dev`, and the deployed `main`
  (single Neon instance). Schema changes and test users created while
  developing hit production data immediately.
- `Navbar` receives the entire `User` row (incl. `passwordHash`) from the
  layout — an existing leak into the client payload that step 8 fixes, since
  that step has to change these props anyway.
- No OAuth library is installed and no OAuth env vars exist.

## Decisions locked in

- **Bare-metal**, no Auth.js. If a step turns out disproportionately painful,
  `arctic` (small, provider-agnostic OAuth helper, no session layer) is the
  fallback — not Auth.js.
- **Providers:** Google (OpenID Connect) and GitHub (plain OAuth 2.0 *OAuth App*).
- **PKCE (S256) + `state` on both providers.** Both support it (GitHub: S256
  only, confirmed in their docs).
- **Identity = `(provider, providerAccountId)`** — Google's `sub`, GitHub's
  numeric user id. Never the email.
- **Don't store provider tokens.** We only need one profile fetch at login
  time, so no `access_type=offline`, no refresh tokens, no token columns.
- **Profile via API, not ID-token parsing:** Google `userinfo` endpoint
  (`https://openidconnect.googleapis.com/v1/userinfo`), GitHub `GET /user` +
  `GET /user/emails`. The access token arrives directly from the provider's
  token endpoint over TLS, so no JWT signature verification library is needed.
- **Only provider-verified emails count.** Google: `email_verified === true`.
  GitHub: the `primary && verified` entry from `/user/emails` (the `email`
  field on `GET /user` can be null/unverified — never used).
- **Always redirect to `/resumes`** after OAuth. No user-supplied `next` URL in
  v1 (no open-redirect surface; the existing `?redirect=` param set by
  middleware isn't consumed anywhere today and stays out of scope).
- **Scopes (least privilege):** Google `openid email profile`; GitHub
  `user:email`.

## Decisions to confirm (proposed defaults — say if you disagree)

### A. Account-linking policy — needs your OK before step 5

Situation: someone clicks "Continue with Google", we get a verified email
`a@x.com`, and a password account for `a@x.com` already exists.

The trap (pre-hijacking): password signup never verifies email. An attacker can
register `victim@x.com` with *their* password today; when the real owner later
signs in with Google and we auto-link, the attacker's password still works on
the owner's account.

| Option | Behaviour | Cost |
|---|---|---|
| **A (proposed)** | Link automatically when the provider says the email is verified. If the existing account's email was never verified (every password account today), also **clear its `passwordHash` and delete all its sessions**, and set `emailVerified`. | A real owner who signed up by password loses password login after their first Google/GitHub login (can still use the provider). Fine for ~5 users; softens once email verification + password reset ship. |
| B | Never auto-link. Show "an account with this email exists — log in with your password, then connect Google in settings". | Needs a connect-provider settings UI. Owner of a pre-hijacked email is locked out. |
| C | Auto-link only if the existing account's `emailVerified` is set; otherwise A. | Same as A until email verification exists. |

Proposed: **A**, written so switching to C later is a one-line condition.

### B. Delete-account confirmation for passwordless accounts — before step 8

`deleteAccount` re-checks the password so a hijacked session can't wipe an
account. OAuth-only users have none.

- **Proposed v1:** they type their account email to confirm. This is a
  guard against misclicks, *not* re-authentication — weaker than the password
  check, and the UI copy should not pretend otherwise.
- Later: real re-authentication (round-trip through the provider again).

## Flow (what we're building)

```
[Continue with Google]  (plain <a href="/api/auth/google">)
  GET /api/auth/google
    - rate limit, generate state + PKCE verifier
    - set httpOnly cookies: oauth_state, oauth_verifier (10 min, path /api/auth, SameSite=Lax)
    - 302 -> accounts.google.com/o/oauth2/v2/auth?...&state=...&code_challenge=...
  ... user consents at Google ...
  GET /api/auth/google/callback?code=...&state=...
    - compare state to cookie (constant time); always clear both cookies
    - POST token endpoint: code + code_verifier + client secret
    - fetch profile -> { id, email, emailVerified, firstName, lastName, imageUrl }
    - resolveOAuthUser(): find / link / create   (policy A)
    - createSession() + setSessionCookie()        (unchanged code)
    - 302 -> /resumes
  any failure -> 302 /sign-in?error=<code>
```

Notes that bite if forgotten:
- The state/verifier cookies must be `SameSite=Lax`, not Strict — the callback
  is a cross-site top-level navigation from the provider and Strict cookies
  wouldn't be sent.
- The buttons must be plain `<a>` tags, not `next/link` — `Link` prefetching
  would fire the start route (and set cookies) before anyone clicked.
- `params` in Next 15 route handlers is a `Promise`. Whitelist the provider
  (`google | github`), 404 otherwise.
- Redirect URI = `${NEXT_PUBLIC_BASE_URL}/api/auth/<provider>/callback`, and it
  must match what's registered at the provider *character for character*
  (scheme, host, port, no trailing slash). Use `localhost`, not `127.0.0.1`,
  everywhere — a different origin has a different `localStorage`, which would
  lose the anonymous resume.
- `fetch` calls to providers get a timeout (`AbortSignal.timeout`).
- Show error messages from a fixed code → message map; never reflect the raw
  query string.

## Steps

Each step is sized to be one reviewable commit. I stop after each one so you
can read the diff; commits/pushes happen only when you ask. Steps 1 and 10 have
explicit confirmation points because they touch the shared database and
production.

### 0. Register the OAuth apps (you, in the provider consoles)

**Google** — Google Cloud Console → *Google Auth Platform*:
1. Branding: app name, support email. (Google may object to `*.vercel.app` as
   an "authorized domain" since it's a public suffix; sign-in with basic scopes
   shouldn't need verification, so this shouldn't block — a custom domain is
   the fix if it does.)
2. Audience: *External*. Starts in **Testing** — only listed test users (max
   100) can sign in, so add your own Gmail. Switch to **In production** before
   real users arrive (basic `openid email profile` scopes need no review).
3. Clients → *Create client* → *Web application*. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://ai-resume-builder-eight-kappa.vercel.app/api/auth/google/callback`

**GitHub** — Settings → Developer settings → OAuth Apps → *New OAuth App*:
- Homepage URL: your site. Callback URL:
  `http://localhost:3000/api/auth/github/callback`.
- Recommended: a **second** OAuth App for production
  (`https://ai-resume-builder-eight-kappa.vercel.app/api/auth/github/callback`)
  so the secret on your laptop and the secret in Vercel are different. (GitHub
  allows up to 10 callback URLs per app, so a single app also works.)

Put the four values in your local `.env` **additively** (new lines only — never
edit or delete existing ones; `.env` is not branch-scoped):
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`,
`GITHUB_CLIENT_SECRET`.

*No code in this step.*

### 1. Schema

`prisma/schema.prisma`:
- `User.passwordHash String` → `String?` (comment: null = OAuth-only account).
- New model:
  ```prisma
  model OAuthAccount {
    provider          String   // "google" | "github"
    providerAccountId String
    userId            String
    user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    createdAt         DateTime @default(now())

    @@id([provider, providerAccountId])
    @@index([userId])
    @@map("oauth_accounts")
  }
  ```
  plus `oauthAccounts OAuthAccount[]` on `User`. `provider` is a `String`, not a
  Prisma enum, so adding a provider never needs a schema change (validated by
  a TS union at the boundary).

Then `tsc --noEmit` and fix the type fallout (expected: `deleteAccount`'s
`verifyPassword(session.user.passwordHash, …)` — temporarily guard it; real fix
is step 8).

**Confirmation point:** `prisma db push` against the shared DB. The change is
additive (nullable column + new table, no data loss) so no `--force-reset`, and
old deployed code keeps working — but I'll ask right before running it. One
caveat: the deployed `main` Prisma client still thinks `passwordHash` is
non-null and will error when it reads a null-hash row. Only OAuth-created rows
have that, so until this ships, treat any local OAuth test account as
throwaway and delete it afterwards.

*(Optional isolation: a Neon branch gives dev its own DB copy on infra you
already use. Not required.)*

### 2. Normalize email casing (prerequisite for linking)

- `signUpSchema` / `logInSchema` (`src/lib/validation.ts`) get `.toLowerCase()`
  after `.trim()`, so `signUp`/`logIn` store and look up lowercase.
- Before deploying: check the live `users` table for any mixed-case emails
  (one query; ~5 users). If any exist, lowercase them or make the OAuth lookup
  case-insensitive (`mode: "insensitive"`) — decide when we see the data.

Verify: signing up with `Foo@X.com` then logging in as `foo@x.com` works.

### 3. Env validation

`src/env.ts`: add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` to `server`, `z.string().min(1)`
like the rest — required, so a missing var fails the build loudly instead of
breaking at runtime.

Vercel needs all four set for **Production and Preview** before this branch
builds there (t3-env validates at build time). Preview URLs change per deploy,
so OAuth itself will only be testable on `localhost` and production.

### 4. OAuth core (pure functions, no routes yet)

New `src/features/auth/oauth/`:
- `pkce.ts` — `generateState()`, `generateCodeVerifier()` (32 random bytes,
  base64url), `codeChallengeFor(verifier)` (SHA-256 → base64url, no padding).
- `providers.ts` — per-provider config (authorize URL, token URL, scopes,
  client id/secret from `env`) and `fetchProfile(accessToken)` returning one
  normalized shape:
  `{ providerAccountId, email, emailVerified, firstName, lastName, imageUrl }`.
  GitHub: `id` from `/user`; email = primary+verified from `/user/emails`; no
  such entry → `emailVerified: false`. GitHub has one `name` — split on the
  first space, fall back to `login` for `firstName`.
- `flow.ts` — `buildAuthorizationUrl(provider, state, challenge)`,
  `exchangeCode(provider, code, verifier)`, `getRedirectUri(provider)`, and the
  state/verifier cookie helpers (set / read-and-clear).

Verify: a throwaway script checks `codeChallengeFor` against the RFC 7636
Appendix B vector (verifier `dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk` →
challenge `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`); `tsc` clean.

### 5. Account resolution — the security-critical step

`src/features/auth/oauth/accounts.ts` — `resolveOAuthUser(provider, profile)`:

1. `OAuthAccount` exists for `(provider, providerAccountId)` → return that user.
   The email isn't consulted at all.
2. `!profile.emailVerified` → fail with `email_unverified`.
3. Find user by email:
   - none → create `User` (`passwordHash: null`, `emailVerified: now`, names
     and `imageUrl` from profile) **and** `OAuthAccount` in one transaction.
   - exists → create the `OAuthAccount`. If that user's `emailVerified` was
     `null` (policy A): set it to now, set `passwordHash` to null, and
     `invalidateAllUserSessions(user.id)` (already exists in `session.ts`).
     Otherwise just link.
4. Concurrent double-callback → unique violation (`P2002`) on the composite key
   or on `email`; catch it and re-run the lookup once.

Kept as its own module so the whole "who is this person" policy is readable in
one place (and easy to swap to policy B/C).

Verify: against the live DB with a throwaway email (same style as the earlier
rate-limit test), covering: new user, returning user, link into an unverified
password account (password stops working, old session dies), link into a
verified account (nothing cleared), unverified provider email refused. Delete
the test rows afterwards.

### 6. Route handlers + middleware

- `src/app/api/auth/[provider]/route.ts` — start (rate-limited via
  `checkRateLimit("oauth:<ip>", …)`, e.g. 10 per 10 min; set cookies; redirect).
  For Google add `prompt=select_account`.
- `src/app/api/auth/[provider]/callback/route.ts` — everything from the flow
  diagram. Provider `?error=access_denied` (user pressed Cancel) →
  `/sign-in?error=oauth_denied`. Every failure path clears the cookies first.
- `src/middleware.ts`: add `"/api/auth"` to `publicRoutes`.

Verify: full round-trip in a browser with your own Google account, then GitHub;
confirm the callback isn't bounced by middleware.

### 7. UI

- New `OAuthButtons` component: "Continue with Google" / "Continue with
  GitHub" (plain `<a>`; inline SVG logos — `lucide-react`'s `Github` icon is
  marked deprecated and slated for removal in v1.0, and it has no Google
  icon), an "or" divider, styled with the
  existing shadcn `Button` (outline) and theme tokens so light/dark both work.
- Add to `SignInForm.tsx` and `SignUpForm.tsx`. Both are the same buttons —
  OAuth doesn't distinguish sign-up from log-in.
- `sign-in/page.tsx` and `sign-up/page.tsx` read `searchParams.error` and show a
  message from a fixed map (`oauth_denied`, `oauth_failed`, `email_unverified`,
  `rate_limited`). Keep the existing `from=editor` copy on sign-up.
- Static hint under the password form: "Signed up with Google or GitHub? Use
  that button instead." The password-login error stays generic — a conditional
  hint would reveal which emails are registered.

### 8. Fallout of passwordless accounts

- `deleteAccount` (`actions.ts`): if `passwordHash` is null, require the typed
  account email instead of a password (decision B). Otherwise unchanged.
- `DeleteAccountDialog.tsx` / `deleteAccountSchema` (`validation.ts:126`):
  the dialog needs to know which mode to show, and adjust its copy/placeholder.
  That means `Navbar` needs a `hasPassword` flag.
- **Fix an existing leak while we're in there:** `(main)/layout.tsx:26` passes
  the whole `session.user` (a full Prisma `User` row, including `passwordHash`
  and `stripeCustomerId`) to `Navbar`, a `"use client"` component. The
  `Pick<User, …>` prop type only narrows at compile time — at runtime the
  entire row is serialized into the page payload sent to the browser. Build an
  explicit `{ firstName, lastName, email, hasPassword: !!passwordHash }` in the
  layout instead, and pass that.
- Grep for any other code that assumes `passwordHash` is present.

Verify: delete an OAuth-only test account end to end; delete a password
account still works with the password; view-source / RSC payload on a logged-in
page no longer contains the hash.

### 9. Verification pass

- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Manual matrix, both providers where it applies:
  1. New user → lands on `/resumes`, navbar initials right.
  2. Returning user → same `User.id`, no duplicate.
  3. GitHub user with a hidden email → still works via `/user/emails`.
  4. GitHub account with no verified primary email → `email_unverified` message.
  5. Existing password user + same email → linked per policy A; old password
     rejected; other sessions logged out.
  6. Google then GitHub with the same email → one user, two `OAuthAccount` rows.
  7. Cancel at the provider → `oauth_denied` message, no session.
  8. Tampered / missing `state`, or cookies cleared mid-flow → rejected, no session.
  9. Reusing an already-used callback URL → rejected.
  10. Anonymous resume in `localStorage` → imported on `/resumes` after OAuth
      signup (`LocalResumeSync`).
  11. Rate limit trips after the configured attempts.
  12. Log out → log back in with OAuth.
  13. Delete an OAuth-only account.
  14. Password sign-up / login still work untouched.
- README: update the auth line in the tech stack to mention OAuth.

### 10. Ship (each item needs your go-ahead in the moment)

1. Create the production Google client and GitHub OAuth App (step 0 details).
2. Add the four env vars to Vercel — **Production and Preview**.
3. Google: switch the consent screen to *In production* when you want anyone
   beyond your test users to sign in.
4. `prisma db push` was already applied in step 1 (shared DB); confirm nothing
   further is pending.
5. Merge `feat/oauth` → `dev` → `main`. Before pushing `main` (it auto-deploys),
   confirm `git branch --show-current` and that `tsc` + `build` are clean.
6. Smoke test on the deployed URL: Google, GitHub, password login, delete
   account. Delete any throwaway test users left in the shared DB.

## Out of scope (deliberately, for later)

- Email verification + password reset (Resend was picked earlier, never
  installed). Once verification exists, revisit linking policy A → C.
- A settings page to connect / disconnect providers, "set a password" for
  OAuth-only users, and the rule that you can't unlink your last login method.
- Showing the provider avatar (`User.imageUrl` is stored but nothing renders it
  yet, and rendering it via `next/image` would need `remotePatterns` for
  `lh3.googleusercontent.com` and `avatars.githubusercontent.com`).
- Honouring the `?redirect=` param the middleware sets (pre-existing gap).
- More providers, provider re-authentication for delete-account, revisiting the
  20-user cap.
