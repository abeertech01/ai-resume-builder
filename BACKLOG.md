# Backlog

## Tasks

1. ✅ reduce the curved radius of the landing page resume's edges.
2. ✅ Change the 'Go to resumes' button to blue in the '/billing/success' route (as the other blue buttons are).
3. ✅ When a resume is opened from "Your Resumes" (/resumes), open the editor at the first step that is not done yet, instead of always the first step. If every step is done, open the last step (Summary).
   1. Right now both links on the resume card go to `/editor?resumeId=<id>` with no `step`, so the editor falls back to the first step ("General Info").
   2. Steps in order: General Info → Personal Info → Work experience → Education → Skills → Summary.
   3. A step is done when the following are filled (this is not stored anywhere, so it is worked out from the saved resume data):
      1. General Info: title. The description is optional, so an empty description does not count against the step.
      2. Personal Info: first name, job title, city, country and email. The photo, the last name and the phone number are optional, so empty ones do not count against the step.
      3. Work experience, Education, Skills: at least one entry each.
      4. Summary needs no rule: it is the last step, so it is where the editor lands once every step before it is done.
   4. Only clicking a resume in the list changes. Inside the editor, Next/Previous and refresh keep working exactly as they do now.
   5. How: one small function that looks at a resume and answers "which step should open?", used by the links on the resume card.
4. ✅ Make the premium modal show only the plan(s) that actually unlock the feature the user clicked. Right now it always shows both "Premium" and "Premium Plus", which is wrong when only Premium Plus unlocks the feature.
   1. "Change colors" button (editor) → the modal should tell the user to subscribe to Premium Plus only.
   2. "Border style" button (editor) → same, Premium Plus only.
   3. "New Resume" button when the resume limit is reached → depends on the plan:
      1. free user (limit 1) → keep both plans, either one unlocks more resumes.
      2. Premium user (limit 3) → only Premium Plus (unlimited) lifts it, so show Premium Plus only.
   4. Keep both plans for everything either plan unlocks: the AI buttons ("Generate summary", "Generate work experience") and the Billing page's subscribe button.
   5. Implementation note: the modal is a single global component (`PremiumModal.tsx`) driven by the `usePremiumModal` zustand store, which only holds `open` right now. It needs to also know which plan(s) unlock the feature, and each place that opens it passes that in.

## Existing Problems

1. **Upgrading can charge twice.** When a Premium user buys Premium Plus, checkout starts a second subscription instead of changing the existing one, so they would pay for both. Deleting the account would also cancel only one of them. (Seen in the code, not tested with Stripe.)
2. **The Billing page says "Your subscription will be cancelled on…" for everyone.** It shows whenever there is a renewal date, not only when a cancellation is scheduled. (Confirmed: the subscription in the database is not set to cancel.)
3. **The color picker opens behind the premium modal.** A free user who clicks "Change resume color" gets the modal and the color picker at the same time. (Seen in a screenshot. Not tested whether a color picked there actually sticks.)
4. **Logged-out visitors get an error on "Get Premium" / "Get Premium Plus".** Checkout needs an account, so the modal shows "Something went wrong". (Confirmed in the browser.)
5. **The user's password hash is sent to the browser.** The layout gives the whole user record, including `passwordHash`, to the navbar, which runs in the browser. Only their own hash, but it should not be there. (Seen in the code: `(main)/layout.tsx` → `Navbar`.)
6. **Emails are not lowercased.** "Foo@x.com" and "foo@x.com" can become two different accounts. (Seen in the code.)
7. **The redirect after login is ignored.** Logged-out users are sent to `/sign-in?redirect=<page>`, but nothing reads it, so after logging in they always land on `/resumes`. (Seen in the code.)
