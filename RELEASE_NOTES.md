## FRAME v0.1.6

### Update reliability
- The FRAME release package now includes the global notification extension.
- The updated Windows updater keeps an already-installed notification extension in sync with FRAME, avoiding false "update available" alerts after upgrades.
- The updater backs up and restores the extension if installation fails.
- The Update Now confirmation uses FRAME's custom modal instead of a browser confirm dialog.

### What to test
- On v0.1.6, no v0.1.6 update notification should appear.
- Verify the extension still works on Home, Search and FRAME.
- Right-click workspace tabs for Rename, Duplicate and Delete.
- Check custom rename/delete dialogs, search, pins and release notes.

### Limitations
- The updated Windows updater script must be installed once to enable extension synchronization.
- Spotify may reload when Spicetify applies an update.
- Windows may show its own external-app protocol permission dialog when launching the updater; FRAME cannot suppress operating-system security prompts.
