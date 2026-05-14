## What I found

- The AI backend is not the current blocker: calling `ai-concierge` directly with `padel for 30 jds` returns the correct padel options under 30 JOD.
- The frontend search/Ask AI flow is the blocker. The home search currently routes typed searches into the AI page instead of simply showing filtered home results, and the AI route uses `?q=` while parts of the app were recently wired inconsistently.
- The old syntax error came from duplicated JSX in `src/routes/index.tsx`; the current file looks syntactically clean, but I will still validate after edits.

## Plan

1. **Make home search actually search on the home page**
   - Keep typed results visible directly under “Nearby services”.
   - Pressing Enter should not leave the page.
   - Queries like `padl for 30 jds`, `padel under 30`, `cleaning under 10`, and `fun near me` should filter the Supabase services list.
   - Add light typo tolerance so `padl` still matches `padel`.

2. **Make Ask AI separate from normal search**
   - The Ask AI button will send the current typed text to `/concierge` only when the user explicitly taps Ask AI.
   - It will use the same search param consistently: `?q=...`.
   - The concierge page will auto-send the query once and show the real AI response.

3. **Stop wasting AI credits for plain search**
   - Normal typing and Enter search will use Supabase data only.
   - Lovable AI will only be called when the user taps Ask AI or sends a message inside concierge.

4. **Improve AI page error visibility**
   - If the function fails, show the real reason in the chat instead of generic repeated fallback text.
   - Keep the user’s input visible so they can retry.

5. **Validate the exact cases**
   - Direct Supabase-backed home search: `padl for 30 jds` should show 22/25 JOD padel courts.
   - AI direct call: already verified working; re-check after frontend wiring.
   - Confirm no syntax error/blank screen remains.

## Files to edit

- `src/routes/index.tsx`
- `src/routes/concierge.tsx`

No database migration is needed, and no Supabase Edge Function redeploy should be needed unless validation shows the deployed function differs from the local code.