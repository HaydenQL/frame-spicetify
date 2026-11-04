# FRAME v0.2.3

- Drag tile bottom-right corner to resize both width (1-4 columns) and height (150-560 px).
- Show a dashed live resize outline with dimensions before applying the new tile size.
- Fix left-to-right pin reorder: dropping on the right half inserts after the target; dropping on the left half inserts before. Favorites still stay in the top group.
- Remove Compact view toggle.
- Add a persistent Shuffle On/Off control that sets Spotify shuffle before playing pinned playlists, albums or tracks when supported by the Spotify player API.
- Right-click a pin for Full-cover artwork, which fills the tile and uses a dark gradient for readable text and buttons. Toggle back to normal artwork through the same menu.
- Keep custom images, workspace backgrounds, favorites, and other existing features.

## Focused tests
1. Drag first pin to the right of the second pin and back.
2. Drag a favorite pin to the right of another favorite.
3. Resize width and height with bottom-right corner; confirm outline updates before release.
4. Set a tile to full-cover artwork through right-click, verify text/play/star stay readable.
5. Toggle Shuffle On, press Play on a playlist, verify Spotify shuffle state. Repeat with Off.
6. Verify Compact view control is gone.

Known limitations: Resizing snaps to grid columns and 10px height steps; Spotify shuffle behavior depends on its playback API. The update helper and automatic artist artwork are still unverified.

# FRAME v0.2.2

## Changes
- Pin editor and Add Pin now render as viewport-centered modal portals instead of scrolling away with FRAME content.
- Add Pin is a full-size tile directly after the last pin. The small toolbar plus is removed.
- Remove the redundant Favorite checkbox from the pin editor; use hover star or right-click.
- Favorite pins stay first but can be reordered. Remove alphabetical sorting mode that prevented dragging.
- Drag the bottom-left corner handle to adjust a pin width across one to three grid columns.
- Denser pin cards with reduced dead space.
- Upload a per-workspace background image. FRAME downsizes it and samples its colors to pick a matching accent.
- Stronger accent tint on the page, pins, and selected Spotify content/sidebar containers where supported.
- Experimental local update bridge: optional Windows helper listens only on 127.0.0.1, accepts Spotify-origin requests, starts the updater and reports status. The release includes frame-update-helper.zip with a double-click installer. This replaces relying on Spotify opening the blocked frame-update protocol.
- Updater now checks the actual installed FRAME_VERSION to avoid stale installed-version.txt preventing installation.

## Install update helper (once)
1. Download frame-update-helper.zip from this release and extract it.
2. Double-click Install-FrameBridge.cmd in the extracted folder. It installs the helper for the current Windows user and starts it.
3. Restart Spotify and use Update now in the next release notification. The helper must be installed and running.
4. If it fails, inspect %LOCALAPPDATA%\\FrameUpdater\\last-update.log and bridge.log. Do not run as administrator.

## Focused tests
- Right-click pin > Edit; dialog centered and scrollable at small window sizes.
- Add Pin tile next to last pin; modal centered and visible.
- Drag a starred pin to reorder it among favorites, unstar and drag again.
- Drag bottom-left resize handle horizontally; tile width changes.
- Upload workspace background; check color picker automatically changes and the left sidebar tint where supported.
- Use Update now with helper installed; status should change from ready to installing to success or error.
- Test at narrow Spotify window widths.

## Known limitations
- Local helper and installer have not been tested on Windows or inside Spotify; origin and Spotify client restrictions may require adjustment.
- Width resizing is discrete grid columns, not pixel-perfect freeform resizing.
- Background palette selection is approximate.
- Automatic artist artwork remains an unresolved Spotify API integration issue.
- Existing already-installed FRAME cannot install the Windows helper itself; one-time setup is required.

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
