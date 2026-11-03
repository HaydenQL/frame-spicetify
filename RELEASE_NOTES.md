## FRAME v0.1.7

### Workspace improvements
- Drag pinned tiles to reorder them while editing a workspace. The arrow buttons remain available for precise or keyboard-friendly adjustments.
- Rename pinned tiles with a custom FRAME dialog, without removing and re-adding them.
- The right-click workspace menu is positioned in the viewport instead of inside Spotify's transformed layout.

### Updates and testing
- Add a Test update notification button in the FRAME footer to preview the notification, release notes and confirmation dialog without launching the updater.
- The global notification extension's version matches FRAME v0.1.7.
- Bundle the notification extension with the verified app release, so the updated Windows updater can synchronize an already-installed extension and restore it if an update fails.
- Clicking Update now directly launches the registered Windows updater, without a second confirmation dialog. Windows may still ask permission to open an external protocol.

### Test plan
1. Before installing v0.1.7, check whether the current extension detects the new release.
2. After installing, verify there is no false update alert for v0.1.7.
3. In FRAME, use Test update notification, expand Release notes and click Test update button. The preview must not launch PowerShell.
4. Edit a workspace, drag pins, rename a pin, then reopen FRAME to verify persistence.
5. Right-click workspace tabs at different positions; test rename, duplicate and delete.
6. Export and import a workspace backup.
7. Before installing, click the real Update now notification. If Windows does not launch the updater, verify the frame-update://install protocol registration.
