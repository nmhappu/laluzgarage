# Workspace Rules - Laluz Garage

## 1. Planning & Decision Making
- **No Guesswork**: Never assume or guess requirements, design patterns, or architectural choices when planning or implementing features.
- **Clarification First**: When requirements are ambiguous, have multiple viable approaches, or involve breaking changes, always pause and ask the user clarifying questions with clear options and trade-offs before proceeding.
- **Incremental Steps**: Outline plans with verifiable milestones and confirm alignment before executing large refactors or complex additions.

## 2. Code Quality & Standards
- **TypeScript**: Adhere to strict type definitions; avoid `any` wherever possible.
- **Linting & Validation**: Ensure changes pass `npm run lint` (`eslint . && tsc --noEmit`) and existing tests (`npm run test`).
- **Firebase & Security**: Respect Firestore security rules (`firestore.rules`) and never hardcode sensitive credentials.
