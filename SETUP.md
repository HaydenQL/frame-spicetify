# FRAME release setup for HaydenQL

Repository: `HaydenQL/frame-spicetify` (create as **public** on GitHub).

## 1. Create repository

Open https://github.com/new, select owner `HaydenQL`, name `frame-spicetify`, choose Public, and create it. No password or token should be shared with anyone.

## 2. Publish first source

Upload `frame/index.js`, `frame/manifest.json`, `updater/Update-Frame.ps1`, `updater/Install-Updater.ps1`, `updater/Uninstall-Updater.ps1` and this SETUP.md to the repository. Do not commit `updater/config.json` if you later add private configuration.

## 3. Create the baseline release

GitHub repository -> Releases -> Draft a new release -> tag `v0.1.1` -> title `FRAME v0.1.1` -> upload both files from `release/`:

- `frame-app.zip`
- `frame-app.zip.sha256`

Publish the release as a stable release, not a draft or prerelease.

## 4. Install the configured FRAME app

First export your workspaces from FRAME v0.1. Back up `%APPDATA%\spicetify\CustomApps\frame` to another folder. Copy the included `frame/` into `%APPDATA%\spicetify\CustomApps\frame` and run `spicetify apply` in PowerShell. The existing storage key remains `frame:workspaces:v1`.

## 5. Install updater (opt-in)

Copy `updater/` to a permanent location, such as `%LOCALAPPDATA%\FrameUpdater`. Open PowerShell in that directory. Run:

```powershell
.\Update-Frame.ps1 -CheckOnly
```

It should say the installation is current if you are running v0.1.1 and the baseline release exists.

Only when ready to enable unattended hourly installation, run:

```powershell
.\Install-Updater.ps1
```

To stop automatic updates, run `./Uninstall-Updater.ps1`.

## 6. Test the upgrade path

Do not publish a fake version number. After preparing a real v0.1.2 update, rebuild `frame-app.zip` containing the top-level `frame/` folder, regenerate its SHA256 sidecar, and publish both assets with tag `v0.1.2`. Then run `./Update-Frame.ps1 -CheckOnly` and `./Update-Frame.ps1` from the updater directory. Verify FRAME loads and your workspace data is preserved.

## Caveats

- This bundle was syntax-checked but **not tested on Windows or inside Spotify**.
- Checksums detect corruption, not a compromised publisher. The repository and GitHub account must be protected.
- The scheduled updater currently **installs automatically** rather than asking permission. Do not enable it unless you want that behavior.
- There is **no one-click Update Now button inside Spotify yet**.
- Updating while Spotify is running can require a restart and may fail. Backups and recovery should be verified on your machine.
- `spicetify apply` might fail following a Spotify update; this is separate from FRAME updates.
