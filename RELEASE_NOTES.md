# FRAME v0.2.1

- Right-click any pin to Edit, Favorite/Unfavorite, Duplicate or Remove, without entering an editing mode.
- Hover a pin for a favorite star and a bottom-right remove button. Favorites always sort ahead of other pins.
- Replace Edit workspace with a + Add pin button.
- Edit dialog scrolls within the viewport so lower fields remain accessible.
- Upload a local image file as pin artwork. Images are resized to at most 480px and converted to compressed JPEG data URLs stored in FRAME's local workspace data. Keep exported backups private if artwork is sensitive.
- Workspace accent colors now tint the homepage backdrop, pin cards, quick access panels and play buttons. Custom hex color picker included.
- More compact tiles, reduced empty space and wider page layout.
- Existing click-to-open, pin playback, drag-and-drop, local recents and cross-workspace favorites retained.

## Focused tests for this release
1. Right-click a pin and edit it; check dialog stays on screen and can scroll.
2. Upload a JPG/PNG to a pin; save and confirm the image displays.
3. Hover a pin to favorite it; verify it appears before nonfavorites.
4. Hover to remove a pin, undo, then drag another pin.
5. Add a pin with the + button, without Edit workspace.
6. Change workspace accent and use Custom color; verify card/background tint changes.
7. Verify clicking a tile opens its destination while the separate play button starts playback.
8. Check right-click menus and star/remove controls on smaller Spotify windows.

## Known limitations
- Spotify artist/playlist automatic cover retrieval still depends on client APIs; this release does not guarantee artist artwork works.
- Background image uploads, automatic palette extraction, and freeform corner-drag resizing are not included yet.
- The embedded Spotify update button still may be blocked by Spotify; use the PowerShell fallback.
- Not yet runtime-tested inside Spotify.

## FRAME v0.2.0

- Remove pin movement arrows. Drag pins while Custom order is selected.
- Click anywhere on a pin's content to open its Spotify destination. No separate Open button.
- Add a dedicated play button to each pin, using Spicetify Player.playUri for supported music content.
- Try Spotify's internal PlaylistAPI and multiple playlist metadata endpoints for real artwork, including user playlists and custom covers.
- Reset stale drag state when removing and undoing pins, and return to Custom order after undo.
- Add Favorites only filter and quick usage tips.
- Retain custom artwork URLs, compact mode, favorites sorting, tile sizes, duplication and export/import.

Test inside Spotify: own and other playlists with custom covers, album art, direct card navigation, play button, drag after undo, favorites filtering. The internal Spotify API varies between Spotify releases and may require further adjustment.

### Additional v0.2.0 homepage features
- Per-workspace accent selector: Spotify green, violet, blue, rose or amber. Colors are stored locally.
- Favorites across workspaces quick-access strip. Mark a pin as a favorite in Edit, then access it from other workspaces without duplicating it.
- Recently opened in FRAME: remembers the last eight distinct destinations opened or played through FRAME, stored locally (not Spotify listening history).
- Quick-access section can be hidden.
- Diagnose artwork button: checks one pinned playlist/album/artist through the same Spotify artwork lookup and reports whether a usable image URL was returned. This is diagnostic, not a guaranteed artwork fix.
- Existing global notification now offers a Copy PowerShell command fallback if Spotify blocks the update URL.

### Additional testing
- Change accent in two workspaces, switch between them, and restart Spotify. Colors should remain independent.
- Star a pin in one workspace; find and open it under Favorites across workspaces from another workspace.
- Open or play several pins, then check Recently opened. Reopen Spotify and confirm the list remains.
- Hide and show Quick access.
- Diagnose artwork for a playlist with a custom cover and report the diagnostic message if the note placeholder remains.
- Verify update notification Copy PowerShell command and manual updater output; the one-click launch is not yet verified.
