# PolyZone: Open World 3D Gunner 🎯

A high-performance 3D multiplayer open-world combat game built with Three.js, React, and Capacitor for Android and Web.

## 🔫 Weapons
- **ARC-4 Assault Rifle**: Automatic rifle, 30-round mag, 600 RPM cyclic rate.
- **Vanguard .50 Bolt Sniper**: High-caliber sniper with bolt cycle delay, lethal headshot damage, and ADS optical scope overlay.
- **Apex-9 Tactical Sidearm**: Rapid semi-automatic pistol, 12-round mag, high mobility.

---

## 🚀 How to Publish & Build the Android APK on GitHub

This repository is pre-configured with a **GitHub Actions CI/CD pipeline** (`.github/workflows/build-apk.yml`) that automatically compiles and publishes the Android APK (`.apk`) file on GitHub.

### Step 1: Create a New Repository on GitHub
1. Go to [GitHub](https://github.com/new) and create a new repository (e.g., `polyzone-gunner`).
2. Copy your repository's URL (e.g., `https://github.com/YOUR_USERNAME/polyzone-gunner.git`).

### Step 2: Push Your Code to GitHub
Run the following terminal commands:

```bash
# Add your GitHub repository as origin
git remote add origin https://github.com/YOUR_USERNAME/polyzone-gunner.git

# Rename branch to main (if not already)
git branch -M main

# Push the project to GitHub
git push -u origin main
```

### Step 3: Download Your APK from GitHub Actions
1. Go to your repository on GitHub.
2. Click on the **Actions** tab at the top.
3. Click on the latest workflow run: **Build and Publish Android APK**.
4. Once completed, scroll down to the **Artifacts** section.
5. Click **PolyZone-Gunner-Debug-APK** to download the compiled `.apk` directly to your phone or computer!

### Step 4: Publish a Public GitHub Release (Optional)
To create a public release with a permanent direct APK download link:
```bash
git tag v1.0.0
git push origin v1.0.0
```
The GitHub Action will automatically create a **Release** on GitHub and attach `app-debug.apk` to it!

---

## 🛠️ Local Android APK Build (Optional)

If you have Android Studio or the Android SDK installed locally:

```bash
# 1. Install dependencies
npm install

# 2. Build the web app and sync with Capacitor Android
npm run build:android

# 3. Open in Android Studio
npx cap open android

# Or build the APK via Gradle command line:
cd android
./gradlew assembleDebug
```
The output APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`
