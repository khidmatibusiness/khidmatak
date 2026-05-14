## Goal
Turn the map screen into a bottom-sheet popup (like the SOS sheet), opened from the home page, instead of navigating to `/map`.

## Changes

1. **New `src/components/MapSheet.tsx`** (based on existing `src/routes/map.tsx`)
   - Props: `{ open: boolean; onClose: () => void }`.
   - Full-screen overlay with the same look as `SosSheet` (dark backdrop + slide-up panel, rounded top, `glass-strong` chrome).
   - Inside: header with back/close button + "Providers map" pill + "Locate me" button (same as today), the Leaflet map (~62vh) lazy-loaded with the existing `LeafletMap` component, and the bottom selected-provider card.
   - Tapping the provider card still navigates to `/pro/$id` and closes the sheet.
   - Lazy-load `LeafletMap` only when `open` is true so the map JS isn't fetched until the user taps the button.

2. **`src/routes/index.tsx`**
   - Replace the `<Link to="/map">View on map</Link>` button with a regular `<button>` that opens the new `MapSheet` (local `useState`).
   - Import and render `<MapSheet open={...} onClose={...} />` at the page root.

3. **Delete `src/routes/map.tsx`**
   - Removes the standalone route. `routeTree.gen.ts` regenerates automatically.

## Notes
- No backend, schema, or AI changes.
- Reuses the existing `LeafletMap` component as-is.
- Pattern mirrors `SosSheet` for consistency (animation, close behavior, z-index).