# AI PROJECT CONTEXT & HANDOFF INSTRUCTIONS
# ⚠️ CRITICAL: DO NOT DELETE OR MODIFY THIS FILE WITHOUT EXPLICIT USER AUTHORIZATION ⚠️

**Project:** Sudoku Lens AI (Family Multiplayer + AI Scanner)
**Last Updated:** January 14, 2026
**Status:** Production (APK Released, Server Live on Render, Database on Neon.tech)

---

## 1. PROJECT ARCHITECTURE

- **Mobile App:** React Native (Expo SDK 54). Folder: `sudoku-mobile/`
- **Backend:** Node.js (Express) + PostgreSQL (Hosted on Neon.tech). Folder: `sudoku-backend/`
- **AI Integration:** Google Gemini 1.5 Flash via `@google/generative-ai`.
- **Hosting:** Render.com (Web Service).
- **Database:** Neon.tech (PostgreSQL) for persistent storage.

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
3.  **Gradle Cache:** We use `C:\SudokuGradleCache` as `GRADLE_USER_HOME` to avoid user folder issues.

### 🅱️ Backend & AI (Render + Gemini + Neon)
**Service URL:** `https://sudoku-app-uyk3.onrender.com`
**Gemini Model:** `gemini-1.5-flash`
**Database:** PostgreSQL via Neon.tech. 
- **Variable:** `DATABASE_URL` must be set in Render environment variables.
- **SSL:** Connection pool in `server.js` requires `ssl: { rejectUnauthorized: false }` for Neon.

### 📱 Mobile App Config
- **Package Name:** `com.german.famidoku` (Production)
- **API Endpoint:** configured in `sudoku-mobile/utils/api.ts`.
- **Keystores:**
    - Release: `sudoku-mobile/android/app/keystores/release.keystore`
    - Alias: `sudoku-key` | Password: `sudokupassword`

---

## 3. KNOWN ISSUES & FIXES

### 1. Render Deployment Fails (404 / 500 / Module Not Found)
*   **Fix:** Ensure `sudoku-backend/package.json` contains `@google/generative-ai`, `multer`, and `pg`. Perform **Clear Build Cache & Deploy** on Render if issues persist.

### 2. Gemini "Model Not Found" (404)
*   **Fix:** Use `gemini-1.5-flash`. Ensure `@google/generative-ai` is `^0.21.0`.

### 3. Data Persistence (Render)
*   **Fix:** Migrated from SQLite to **PostgreSQL (Neon.tech)**. SQLite files in Render are ephemeral and deleted on every deploy. PostgreSQL ensures data (puzzles, scores) persists.

### 4. Android Build Failures (Unresolved Reference R / BuildConfig)
*   **Fix:** When changing the package name in `app.json` and `build.gradle`, you MUST move the Kotlin files to the matching directory: `sudoku-mobile/android/app/src/main/java/com/german/famidoku/`.

---

## 4. HOW TO BUILD & DEPLOY

### Generate Release APK (Windows)
**Safe Command (PowerShell):**
```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"; $env:GRADLE_USER_HOME="C:\SudokuGradleCache"; $env:TMP="D:\Proyectos\Sudoku\temp"; $env:TEMP="D:\Proyectos\Sudoku\temp"; cd sudoku-mobile\android; .\gradlew.bat assembleRelease
```
**Output:** `sudoku-mobile\android\app\build\outputs\apk\release\app-release.apk`

---

## 5. RECENT CHANGES & LEARNINGS (Jan 14, 2026)

1.  **Root Cleanup:** Removed all legacy web/Vite files. Project is now strictly Backend + Mobile.
2.  **Database Migration:** Migrated from SQLite to PostgreSQL (Neon.tech). Updated `server.js` to use `pg` Pool and adapted all SQL queries. 
    - *Note:* Postgres uses `SERIAL` for auto-increment and `TIMESTAMP` for dates.
    - *Note:* Postgres returns column names in lowercase (e.g., `row.initialgrid` instead of `row.initialGrid`).
3.  **Production Branding:** Changed package to `com.german.famidoku` and moved all Android source files to the correct package directory structure.
4.  **TypeScript Fixes:** Applied `as any` to Reanimated transforms and coerced boolean props (`!!`) in `App.tsx` to satisfy strict type checking.
5.  **Force Push:** Performed a force push to the remote repository to establish the cleaned-up and migrated state as the definitive `feature/auth` branch.

**🤖 NOTE TO AI AGENTS:**
Always use `pool.query()` for database operations. 
The database initializes itself via `initDB()` in `server.js`.
Ensure `DATABASE_URL` is present for the backend to start.
