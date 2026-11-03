## FRAME v0.1.5

### Workspace improvements
- Create workspaces using the compact **+** button at the end of the workspace tabs.
- Right-click any workspace tab for **Rename**, **Duplicate**, and **Delete**.
- Rename and delete use FRAME's own dialogs instead of browser prompts.
- The Edit workspace control now sits inside the active workspace header.
- A clearer Add a pin form replaces the cluttered workspace management controls.

### Release notes and performance
- Release notes appear directly in FRAME without opening GitHub.
- Notes are cached during Spotify navigation to avoid reloading an empty panel each time.
- FRAME removes auto-generated Full Changelog links from its release notes display.
- The release workflow now checks the app's version and JavaScript syntax before publishing.

### Update system
- The global notification extension remains opt-in and runs across Spotify views once installed.
- The Update Now button launches the local Windows updater with confirmation.
- Applying a FRAME update may still reload Spotify and interrupt playback.

### Known limitations
- Navigation between Spotify pages can still take time due to Spotify/Spicetify route rendering; this release improves notes loading but does not guarantee instant transitions.
- The global extension currently embeds its version separately and needs an update to remain synchronized with future releases.
