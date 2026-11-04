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
