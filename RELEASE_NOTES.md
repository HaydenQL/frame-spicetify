## FRAME v0.2.0

- Remove pin movement arrows. Drag pins while Custom order is selected.
- Click anywhere on a pin's content to open its Spotify destination. No separate Open button.
- Add a dedicated play button to each pin, using Spicetify Player.playUri for supported music content.
- Try Spotify's internal PlaylistAPI and multiple playlist metadata endpoints for real artwork, including user playlists and custom covers.
- Reset stale drag state when removing and undoing pins, and return to Custom order after undo.
- Add Favorites only filter and quick usage tips.
- Retain custom artwork URLs, compact mode, favorites sorting, tile sizes, duplication and export/import.

Test inside Spotify: own and other playlists with custom covers, album art, direct card navigation, play button, drag after undo, favorites filtering. The internal Spotify API varies between Spotify releases and may require further adjustment.
