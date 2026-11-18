# Ninja Games: iOS & Android app

This is the player app for Ninja Games, built with Expo SDK 58, React Native and Expo Router.
It talks only to the server's `/api/app/*` routes. Players have no direct
Firestore access under the hardened rules.

## Ecosystem
PC Kiosk · TV Kiosk (PS5) · Admin EXE · **iOS app · Android app**. They all share one Firebase
backend through the Next.js server (`../server`).

## Setup
```
cd mobile
npm install
copy .env.example .env      # then fill EXPO_PUBLIC_FIREBASE_API_KEY (+ SUPPORT_EMAIL)
```

## Run
- **Phone (dev build):** `npx expo run:android` / `npx expo run:ios`. Expo Go is not enough,
  because the camera scanner needs a development build.
- **Browser preview with sample data, no server needed:**
  `set EXPO_PUBLIC_DEMO=1 && npx expo start --web`. Never ship a build with DEMO set.
- Typecheck: `npm run typecheck`

## Build & release (no Mac needed)
```
npx eas-cli@latest login
npx eas-cli@latest build --platform android   # .aab for Google Play
npx eas-cli@latest build --platform ios       # needs an Apple Developer account
```
The Android package id is `com.ninjagamesjo.player`, the same id as the existing Play listing, so this
ships as an update. Its version code must be higher than the current Play release.

## Screens
Sign in · Move from EasyCafe · Create account · **Home** · **Play** (PC map + hold, PS5 stations)
· **Scan** (PS5 QR) · **Wallet** (PC ⇄ PS, 5% fee) · **Order** (food, hookah, tobacco) · **Squad**
(friends + chat) · Events (tournaments + leaderboard) · Profile (language, sign out, delete account).

## Art
All artwork comes from `assets/art/` by fixed filename. See `design/asset-prompts.md` to
generate replacements, and overwrite the files to update. No code change is needed.
