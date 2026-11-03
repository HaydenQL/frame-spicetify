# FRAME v0.1.4: installation and test

## Release
Use Actions > Publish FRAME release > Run workflow > main > version `v0.1.4`.
Confirm the release contains `frame-app.zip`, `frame-app.zip.sha256`,
`frame-updates.js`, and `Install-FrameNotifications.ps1`.

## Update FRAME
Run from `%LOCALAPPDATA%\FrameUpdater`:
```powershell
.\Update-Frame.ps1 -CheckOnly
.\Update-Frame.ps1
.\Update-Frame.ps1 -CheckOnly
```
Restart Spotify only if necessary. Verify FRAME footer reads 0.1.4.

## One-time global notifications setup
Download both `frame-updates.js` and `Install-FrameNotifications.ps1` from
the v0.1.4 release into the same directory. Run the installer as the current
Windows user:
```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Install-FrameNotifications.ps1
```
Approve the Spicetify apply prompt only when ready for possible playback interruption.
This installs the global extension and registers `frame-update://install`
under HKCU. Your browser or Spotify may ask permission to open the protocol.

## Test
- Search pinned items; clearing search restores them.
- Duplicate a workspace; editing its pins does not change the original.
- Rename the duplicate; workspaces persist after Spotify reload.
- Open release notes on FRAME page; no browser window should open.
- A notification only appears when a release NEWER than 0.1.4 exists.
- The global toast can appear outside FRAME and provides Release notes, Update now, Later.
- Update now asks for confirmation and launches the Windows updater.
- Music may be interrupted by Spicetify apply. This is not seamless updating.

## Limitations
- The global extension and Windows protocol require one-time setup.
- The extension's version is embedded in its source and must be updated in a
  future release. Updating the FRAME custom app does not currently update
  the global extension automatically.
- No release notification can be tested on 0.1.4 until a later release exists.
- The local Windows protocol may be invoked by other applications/websites;
  it always performs the fixed updater action, never executes URL arguments.
- The updater backs up the custom app but does not guarantee playback continuity.
