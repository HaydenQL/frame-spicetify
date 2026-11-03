## FRAME v0.1.9

- Fetch actual Spotify playlist, album, artist, track, podcast and episode covers through Spicetify's authenticated Spotify API instead of the blocked public oEmbed endpoint.
- Playlist metadata fallback through Spotify's internal Cosmos endpoint.
- Optional custom HTTPS artwork URL for any pin.
- Mark pins as favorites and sort favorites first.
- Sort pins alphabetically or use custom drag order.
- Compact layout toggle for more pins on screen.
- Normal and large tile sizes per pin.
- Duplicate pins in Edit workspace.
- Undo the most recent pin removal.
- Edit name, destination, artwork, favorite status and size in one dialog.
- Keep workspace tab dragging and pin dragging from v0.1.8.

Testing: Verify real playlist covers on public and owned playlists; album and artist covers; edit a pin's custom image; favorites sorting; compact mode; duplicate/remove/undo; large tiles; and drag ordering after returning to Custom order.

Known limitation: Actual Spotify cover loading requires the embedded Spotify API to return images; custom URL images must be HTTPS. UI/runtime testing in Spotify is still required.
