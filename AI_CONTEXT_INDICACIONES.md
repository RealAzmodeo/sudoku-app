# AI PROJECT CONTEXT & HANDOFF INSTRUCTIONS
# ⚠️ CRITICAL: DO NOT DELETE OR MODIFY THIS FILE WITHOUT EXPLICIT USER AUTHORIZATION ⚠️

**Project:** Sudoku Lens AI (Family Multiplayer + AI Scanner)
**Last Updated:** January 12, 2026
**Status:** Production (APK Released, Server Live on Render)

---

## 1. PROJECT ARCHITECTURE

- **Mobile App:** React Native (Expo SDK 54). Folder: `sudoku-mobile/`
- **Backend:** Node.js (Express) + SQLite (Locally stored db file `sudoku.db`). Folder: `sudoku-backend/`
- **AI Integration:** Google Gemini 2.5 Flash via `@google/generative-ai`.
- **Hosting:** Render.com (Web Service).

---

## 2. CRITICAL ENVIRONMENT CONFIGURATIONS

### 🅰️ Android Build (Windows Environment)
**Problem:** The user's Windows username is "Germán". The accent ('á') breaks Java/Gradle file paths in the standard `C:\Users\Germán`...` location.
**SOLUTION (Already applied):**
1.  **SDK Location:** The Android SDK is located at `D:/Programa/AndroidStudio/Sdk`.
2.  **local.properties:** This file in `sudoku-mobile/android/local.properties` MUST point to the D: drive path.
    ```properties
    sdk.dir=D:/Programa/AndroidStudio/Sdk
    ```
3.  **Gradle Cache:** We sometimes use `C:\SudokuGradleCache` as `GRADLE_USER_HOME` to avoid user folder issues.

### 🅱️ Backend & AI (Render + Gemini)
**Service URL:** `https://sudoku-app-uyk3.onrender.com`
**Gemini Model:** `gemini-2.5-flash`
**Dependencies:**
- Must use `@google/generative-ai` version `^0.21.0` or higher to support new models.
- **Deploy Trigger:** The root `package.json` has a `postinstall` script: `"cd sudoku-backend && npm install"`. This ensures Render installs the backend dependencies correctly even though the root directory is set to `sudoku-backend`.

### 📱 Mobile App Config
- **API Endpoint:** configured in `sudoku-mobile/utils/api.ts`.
- **Keystores:**
    - Debug: Standard Expo debug keystore.
    - Release: `sudoku-mobile/android/app/keystores/release.keystore`
    - Alias: `sudoku-key` | Password: `sudokupassword`

---

## 3. KNOWN ISSUES & FIXES

### 1. Render Deployment Fails (404 / 500 / Module Not Found)
*   **Cause:** Render caches old `node_modules` or fails to install dependencies in the subdirectory.
*   **Fix:**
    1.  Ensure `sudoku-backend/package.json` contains `@google/generative-ai` and `multer`.
    2.  On Render Dashboard, perform **Manual Deploy -> Clear Build Cache & Deploy**.

### 2. Gemini "Model Not Found" (404)
*   **Cause:** The API Key provided has specific access rights or the library version defaults to `v1beta`.
*   **Fix:**
    - Library updated to `0.21.0`.
    - Model name set explicitly to `gemini-2.5-flash` (User has access to this specific model).
    - API Key: `AIzaSyBUg...` (Environment Variable or Hardcoded in server.js).

### 3. "Puzzle ID Not Found" on Client
*   **Cause:** User created a puzzle on a local/dev server instance, and another user tries to fetch it from Prod.
*   **Fix:** Create a NEW puzzle. It will be uploaded to the live Render DB.

---

## 4. HOW TO BUILD & DEPLOY

### Generate Release APK (Windows)
Do not use `npx expo build:android` locally due to username issues unless environment vars are set.
**Safe Command (PowerShell):**
```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"; $env:GRADLE_USER_HOME="C:\SudokuGradleCache"; $env:TMP="D:\Proyectos\Sudoku\temp"; $env:TEMP="D:\Proyectos\Sudoku\temp"; cd sudoku-mobile\android; .\gradlew.bat assembleRelease
```
**Output:** `sudoku-mobile\android\app\build\outputs\apk\release\app-release.apk`

### Deploy Backend
Push changes to `main` branch. Render auto-deploys.
If logic changes in `server.js` don't seem to apply, FORCE `Clear Cache` on Render.

---

## 5. RECENT CHANGES (Changelog)
- **v5.0 (Redesign):** 
    - Complete Home redesign (Play vs Create hierarchy).
    - Unified Settings Modal (Theme, Sound, VFX, Language).
    - Mandatory User Onboarding (Username persistence).
    - Auto-save System: Progress saved per `puzzleId` locally.
    - Puzzle Locking: Completed games (Win/Loss) are locked to prevent cheating.
    - Community Puzzles: List of shared puzzles from the family server.
    - Game Pause: Blurs board and stops timer.
- **v4.0:** Cloud Sync for Scanned Puzzles.
- **v3.0:** Gemini 2.5 Flash Scanner.
- **v2.0:** Multiplayer Leaderboard.
- **v1.0:** Local offline game.

---

**🤖 NOTE TO AI AGENTS:**
The app now uses a complex phase-based navigation (`AppPhase`). 
Auto-save keys follow the pattern `@sudoku_autosave_{puzzleId}`. 
Locked puzzles use `@sudoku_locked_{puzzleId}`.
Always prioritize local progress (`getAutoSave`) before fetching virgen puzzles from the API in `handleJoinGame`.

