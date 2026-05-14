You're right — I found why it feels broken.

Root causes:
- The home search only filters the first 8 cheapest services, so searches like `padel for 30 jds` never see padel because padel is service #12/#14 in the database.
- Pressing Enter in the home search currently does nothing; it only has a comment saying it filters in place.
- The `Ask AI` button on home is not actually calling AI. It opens a local suggestion sheet using the same limited 8 services, so it repeats the same stuff.
- The real AI chat route exists, but the AI backend is likely using the wrong Lovable AI Gateway header format, so it can fail or return generic fallback behavior.

Plan:
1. Replace the home search data fetch with a real Supabase search over active services, not just the first 8 cheapest.
   - Match against service name, Arabic name, category, and subcategory.
   - Parse simple budget phrases like `under 30`, `30 jds`, `below 25`, etc.
   - For `padel for 30 jds`, return padel courts priced at or below 30 JOD.

2. Make the search bar actually do something.
   - Typing will update visible results.
   - Pressing Enter will show matching results clearly instead of doing nothing.
   - If no match exists, show a useful empty state instead of pretending nothing changed.

3. Change the home `Ask AI` behavior.
   - If the user typed something, `Ask AI` should open/send that exact query to the AI Concierge.
   - Remove the fake repeated “AI suggestions” behavior that only shows the same local list.

4. Fix the AI backend call.
   - Update the AI Gateway request to use the required `Lovable-API-Key` and `X-Lovable-AIG-SDK` headers.
   - Keep the live Supabase catalog grounding so AI responses are based on real services and prices.
   - Make the AI response list real matching services with names/prices and say honestly when there are no matches.

5. Improve “near me / fun” handling.
   - Since the current database has no coordinates, treat “near me” as West Amman available services for now.
   - Map “fun” to sports/beauty activities like padel, tennis, gym, swimming, spa, etc.

6. Verify with these examples:
   - `padel for 30 jds` returns the 22 JOD and 25 JOD padel courts.
   - `something fun near me` returns activity-style services.
   - `cleaning under 10` returns cleaning services under 10 JOD.
   - Random text shows a proper no-results message.