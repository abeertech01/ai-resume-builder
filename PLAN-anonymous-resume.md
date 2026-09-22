# Plan: Anonymous Free-Tier Resume Building

Branch: `feat/free-threshold`

## Goal

Let a visitor build one resume (free-tier rules: no AI, no customization,
max 1 resume) **without** creating an account. Data lives in browser
`localStorage` instead of the database. If they later sign up or log in,
that local resume is imported into their new account.

Logged-in behavior is unchanged end to end — same DB path, same server
actions, same enforcement.

## Why this isn't a quick change

Every layer today assumes a session exists and hard-blocks otherwise:

- `src/middleware.ts:28-32` — redirects any request without a session
  cookie to `/sign-in` before `/editor` ever renders.
- `src/app/(main)/layout.tsx:14` — `if (!session) return null;` blanks the
  page for every route in the group (editor, resumes, billing alike).
- `src/app/(main)/editor/actions.ts:19-21` (`saveResume`) and the AI
  actions in `forms/actions.ts` each independently throw
  `"User not authenticated"`.
- There is no localStorage/client-persistence pattern anywhere in the
  codebase (`grep -rln "localStorage" src` is empty) — this is new
  plumbing, not a reuse of something existing.

The parts that *don't* need to change: `ResumeValues`, `ResumePreview`,
and PDF export all already work purely off in-memory client state with no
DB/auth coupling, so editing, previewing, and printing a local-only resume
needs no new work once the data reaches the editor.

## Decisions locked in

- **Photos**: stored as a base64 data URL directly in localStorage. No
  network upload for anonymous users. `ResumePreview.tsx:71-79` already
  renders a `string` photo as `<img src>`, so no preview changes needed.
- **Signup/login migration**: if localStorage has a local resume and the
  newly authenticated user has 0 resumes in the DB, auto-import it and
  clear localStorage. No user-facing prompt.
- **Entry point**: no anonymous resume-list page. The landing page's
  "Get started" sends logged-out visitors straight to `/editor`, which
  loads their one local resume if it exists or starts blank.

## Steps

Each step is a self-contained commit. Stop and confirm after step 3
(the auth-gating change) before continuing, since it's the part most
likely to have a subtle regression for logged-in users.

### 1. Local storage layer (new, isolated, no risk to existing code)

New file `src/lib/localResume.ts`:
- `getLocalResume(): ResumeValues | null` / `setLocalResume(values)` /
  `clearLocalResume()`, keyed under a single fixed localStorage key
  (e.g. `"anonymous-resume"`) since anonymous users only ever have one.
- Photo handling: convert `File → base64` (via `FileReader`) before
  writing; leave `string` photos (already base64, or already loaded) as
  is. Wrap all localStorage access in try/catch (private browsing,
  disabled storage, quota exceeded) and fail soft — don't crash the
  editor if persistence fails.
- Cap the photo specifically for anonymous uploads well below the
  existing 4MB limit in `src/lib/validation.ts:21` (e.g. 1MB) — base64
  adds ~33% overhead and localStorage is only ~5-10MB total per origin.
  Client-side downscale/compress before storing if it's easy to add
  (`canvas` resize), otherwise just enforce the lower cap.

New hook `src/app/(main)/editor/useLocalAutoSaveResume.ts`, mirroring
`useAutoSaveResume.tsx`'s debounce pattern (800ms — shorter than the
DB-backed hook's 1500ms since there's no network/blob-upload cost to
saving locally) but writing to `localResume.ts` instead of calling the
`saveResume` server action. No `resumeId`/URL update needed since
there's nothing server-side to point to.

### 2. Editor: branch between DB-backed and local-backed save

`src/app/(main)/editor/ResumeEditor.tsx`:
- Accept an `isAnonymous: boolean` prop.
- If anonymous: hydrate initial `resumeData` from `getLocalResume()`
  instead of `{}`; use `useLocalAutoSaveResume` instead of
  `useAutoSaveResume`.
- Nothing else in this component (the step forms, preview) needs to
  change — they already just read/write the `resumeData` object.

`src/app/(main)/editor/page.tsx`:
- If `getCurrentSession()` returns null, skip the Prisma fetch entirely
  and render `<ResumeEditor resumeToEdit={null} isAnonymous />` instead
  of the current `return null`.

### 3. Stop hard-blocking `/editor` for anonymous users

This is the part that needs care — don't loosen more than `/editor`.

`src/middleware.ts`: add `/editor` to `publicRoutes` (exact match is
fine; `/editor` doesn't have sub-paths today).

`src/app/(main)/layout.tsx`: currently blanks the page for *every*
child route when there's no session. Change it to stop being a blanket
gate:
- Compute `session` as today, but don't `return null` outright.
- Default `userSubscriptionLevel` to `"free"` when there's no session
  (this is what makes the existing `canUseAITools`/`canUseCustomizations`
  gates in `GenerateSummaryButton`, `ColorPicker`, `BorderStyleButton`
  correctly block AI/customization for anonymous users — no new logic
  needed there, they already read from `SubscriptionLevelProvider`).
- Pass `user={session?.user ?? null}` to `Navbar` and make `Navbar`
  render a logged-out state (sign in / sign up links) when `user` is
  null — check `Navbar.tsx`'s current prop typing, it likely assumes
  `user` is always present.
- `/resumes` and `/billing` still require auth: since the layout no
  longer redirects, each of those pages must do its own
  `if (!session) redirect("/sign-in")` — they currently rely on the
  layout for this, so removing the blanket gate without adding this
  would silently break them.

### 4. AI tools & customization for anonymous users

No new code — this falls out of step 3's `"free"` default. Verify by
hand: on `/editor` logged out, the AI generate buttons and color/border
controls should already show the upsell modal instead of doing
anything, exactly like a logged-in free-tier user sees today.

If an anonymous user somehow triggers `generateSummary`/`saveResume`
directly (bypassing the UI), those still throw `"User not
authenticated"` — anonymous mode must never call these actions, only
`useLocalAutoSaveResume`. Double check no code path in the anonymous
branch accidentally still calls the DB-backed hook.

### 5. Landing page entry point

`src/app/page.tsx` / `src/app/components/GetStartedBtn.tsx`: currently
routes everyone to `/resumes` (which bounces anonymous users to
`/sign-in` today). Change the logged-out CTA to route to `/editor`
directly. Logged-in users keep going to `/resumes` as today.

### 6. Import local resume on signup/login

In `src/app/(main)/layout.tsx` (now that it renders for authenticated
users as before), when there **is** a session: query the user's resume
count alongside the existing subscription-level fetch. If `count === 0`,
render a small client component (e.g. `<LocalResumeMigrator />`) that
on mount:
1. Reads `getLocalResume()`.
2. If present, reconstructs a `File` from the stored base64 (via
   `fetch(dataUrl).then(r => r.blob())` → `new File(...)`) if there's a
   photo, so the payload matches what `saveResume` already expects
   (`photo instanceof File` triggers the blob upload path in
   `editor/actions.ts:57-76` — no changes needed to `saveResume` itself).
3. Calls the existing `saveResume(values)` server action (no `id`, so
   it takes the create path).
4. On success, `clearLocalResume()`.

This reuses `saveResume` as-is rather than writing a parallel import
action — it already validates, uploads the photo, and enforces
`canCreateResume`/`canUseCustomizations`, which is exactly the create
path a migrated resume should go through.

If `count > 0` (edge case: user already has resumes some other way),
leave localStorage untouched rather than guessing what to do —
not worth solving now.

### 7. Manual verification pass

No test suite exists for auth/editor flows today (worth noting, not
fixing here). Verify by hand in the browser:
- Logged out: land on `/`, click "Get started" → lands on `/editor`
  with a blank resume, no redirect to `/sign-in`.
- Fill in the resume, refresh the page → data persists (localStorage).
- Confirm AI buttons and color/border controls show the upsell modal,
  do nothing else.
- Sign up from the logged-out `/editor` (via Navbar) → confirm the
  resume the user just built appears in `/resumes` after signup, and
  `localStorage` is cleared.
- Confirm existing logged-in flows (create/edit/delete resume, AI
  generation, customization, billing) are unaffected — this is the
  regression risk from touching `(main)/layout.tsx` and `middleware.ts`.

## Open items not covered by this plan (flag if they matter)

- No rate-limiting concern for anonymous `/editor` since nothing hits
  the server or DB until signup — the only new unauthenticated surface
  is a page render, not an API.
- Anonymous users on a second device/browser get a fresh blank resume
  (localStorage doesn't sync) — expected, not a bug.
- If localStorage is full/blocked (private browsing), the editor should
  still work in-memory for the session; it just won't survive a
  refresh. Handled by the try/catch in step 1, not a hard failure.
