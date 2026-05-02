# Life Maker

Life Maker is a healthcare adherence MVP built with Expo, React Native, and React Native Web.
It helps clinic staff create treatment plans, helps patients complete daily plan items, and helps clinics identify who needs follow-up.

The current version is a single-codebase demo for web and mobile with local persistence and seeded demo users.

## Current Features

- Doctor/staff login
- Patient login by phone
- Admin login
- Doctor dashboard with active patients, check-ins today, and follow-up list
- Patients list
- Add patient form
- Patient detail page with adherence summary
- Create and edit one active plan per patient
- Patient today screen with `done`, `not_done`, and `later`
- Patient full plan and recent history
- Admin dashboard, clinics, users, and patients pages
- Local persistence with `AsyncStorage`
- Seeded demo data

## Tech Stack

- Expo
- React Native
- React Native Web
- TypeScript
- AsyncStorage

## Project Structure

- `App.tsx`  
  Application entry point.

- `src/LifestyleApp.tsx`  
  Main application shell, local navigation, and screen composition.

- `src/types`  
  Domain models for clinics, users, patients, plans, plan items, and daily checks.

- `src/data`  
  Demo seed data for all three roles.

- `src/hooks`  
  Persistent application state, auth, and page actions.

- `src/services`  
  Storage layer.

- `src/utils`  
  Date helpers and adherence/follow-up logic.

- `src/components`  
  Reusable UI primitives.

## Getting Started

### Install dependencies

```bash
npm install
```

### Run on web

```bash
npm run web
```

Note: the web script is configured to start Expo in offline mode because this environment may not have reliable access to Expo's remote dependency checks.

### Run on Android

```bash
npm run android
```

You can run the Android build in one of these ways:

- with an Android emulator started from Android Studio
- with a physical Android device connected through USB debugging
- with Expo Go for local development

### Run the default Expo server

```bash
npm start
```

## Type Checking

```bash
npm run typecheck
```

## Demo Credentials

- Admin: `admin@lifemaker.local` / `admin123`
- Doctor/staff: `doctor@lifemaker.local` / `doctor123`
- Patient: `09120000001`

## Implementation Notes

- The app currently uses local-only persistence.
- The current UI is MVP-focused and optimized for local demo use.
- The web and mobile experience share the same core logic and state model.
- Follow-up is triggered when there is no DailyCheck in the last 2 days, 7-day adherence is below 40%, or the patient has an active plan with no first check-in.

## Roadmap

- stronger form validation
- real backend and authentication
- production mobile packaging
- reminder delivery integration

## Repository

GitHub repository:

`https://github.com/nedafarhoudi/Life_Maker_Web`
