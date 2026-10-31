# Tanglaw app updates and Android downloads

## One-time setup

1. Create an Expo access token in the Expo account that owns this project.
2. In GitHub, add it as the repository Actions secret `EXPO_TOKEN`.
3. Push these workflow files to the `master` branch.
4. Run **Build and publish Android APK** from the repository's Actions tab. The workflow builds the OTA-enabled APK and creates or replaces the fixed `android-apk` GitHub Release asset.
5. Install the APK from the website's Android download button. Keep this first installed build at the same app version as future compatible OTA updates.

The Expo token must belong to an account with access to the EAS project ID configured in `app.json`. If the build reports `Entity Not Authorized`, sign in to the correct Expo account or grant that account access to the project before retrying.

The stable APK URL is:

`https://github.com/newtical/tanglaww/releases/download/android-apk/tanglaw-latest.apk`

The download QR continues to open the website's Download section. The user can then tap the manual APK download link.

## Publishing future changes

- Changes to JavaScript/TypeScript screens, components, context, libraries, or bundled assets on `master` automatically publish an OTA update to the `production` channel. The app checks at launch and when it returns to the foreground, then asks the user before downloading and restarting.
- Changes to Expo configuration, dependencies, native code, permissions, or native modules require a new APK. Run **Build and publish Android APK** manually after the change; the workflow replaces the APK at the same URL.
- APK installation remains user-driven. Android does not silently install a replacement APK downloaded from the website.
- Do not publish an OTA update that depends on native changes before users have installed the corresponding APK. Keep the Expo app version/runtime compatible for OTA-only releases, and increment the app version when a native release must establish a new runtime.

GitHub Actions requires the `EXPO_TOKEN` secret. GitHub provides the release-upload token automatically to the APK workflow.
