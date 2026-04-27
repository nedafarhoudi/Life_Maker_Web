# Life Rhythm

Life Rhythm is a Persian-first lifestyle management application built with Expo, React Native, and React Native Web.  
It is designed for users who manage multiple life roles at the same time and need a structured way to track recurring responsibilities, urgency, balance, and daily consistency.

The current version focuses on a single-codebase experience for web and mobile, with RTL UI, local persistence, recurring task scoring, and a role-based dashboard.

## Product Concept

This project is not a generic to-do list.

It is a rhythm-based life management system where:

- a user defines major life roles
- each role contains dimensions
- each dimension contains tasks
- recurring tasks are evaluated by cadence and urgency
- daily score and consistency reflect how well life responsibilities are being maintained

The initial product direction is based on a multi-role lifestyle scenario including motherhood, work, home management, relationships, personal growth, and family care.

## Current Features

- Persian-first RTL interface
- Shared codebase for web and mobile
- Onboarding flow for selecting active roles
- Daily dashboard with score, progress, and pending task billboard
- Today view with urgency-based task ordering
- Role and dimension overview
- Quick-add actions for roles, dimensions, and tasks
- Recurrence-aware task status calculation
- Score preview and daily score tracking
- Local persistence with `AsyncStorage`
- Seeded Persian sample data

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
  Domain models for roles, dimensions, tasks, completions, and app state.

- `src/data`  
  Seed data used to bootstrap the initial experience.

- `src/hooks`  
  Persistent application state and state mutations.

- `src/services`  
  Storage layer.

- `src/utils`  
  Date helpers, recurrence logic, and scoring logic.

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

## Implementation Notes

- The app currently uses local-only persistence.
- The recurrence model supports daily, interval, weekly, monthly, and manual task patterns at the domain level.
- The current UI is intentionally product-oriented, but still an early version of the broader roadmap.
- The web and mobile experience share the same core logic and state model.

## Roadmap

- richer task creation and editing flows
- deeper analytics and reporting
- better certificate and streak visualization
- cloud sync support
- authenticated multi-user support
- production packaging for Android release

## Repository

GitHub repository:

`https://github.com/nedafarhoudi/Life-rhythm`
