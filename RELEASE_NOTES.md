## FRAME v0.1.8

### Workspace and pin improvements
- Reorder workspace tabs by dragging them, without opening an editor.
- Reorder pinned tiles by dragging them at any time, without entering Edit workspace. Editing arrows remain available.
- Edit an existing pin's display name and Spotify destination together in a custom FRAME dialog.
- Show Spotify artwork on supported album, playlist, artist, track, show and episode pins when Spotify's public oEmbed thumbnail endpoint is available.
- Use colorful gradient artwork with recognizable icons for library/search pins and as fallback when no thumbnail is available.
- Larger, more visual pinned tiles and drag-target highlighting.

### Included from previous releases
- Custom workspace dialogs and cursor-positioned right-click menus.
- Update notification preview and direct Update Now action.
- Local workspace backup export and import.

### Test
- Drag tabs into a new order and restart Spotify to verify persistence.
- Drag pins without Edit workspace, and verify their order persists.
- Edit an existing pin and change both its name and Spotify link.
- Check artwork on several playlist/album pins and fallback artwork on Liked Songs, Search and Library.
- Confirm workspace management, notification preview and release notes still work.

Artwork availability depends on Spotify's oEmbed endpoint. No guarantee of a thumbnail for every Spotify URI.
