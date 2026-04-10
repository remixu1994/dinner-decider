# Dinner Decider Agent Guide

## Project Summary

Dinner Decider is a Next.js App Router application for coordinating a family's dinner workflow in one place:

- create or join a family
- collect dinner requests from members
- assemble and publish the current menu
- capture post-meal feedback
- review history and manage members

The app uses Prisma with a local SQLite database and stores the current session in an HTTP-only cookie.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- `@libsql/client` with local SQLite

## Key Commands

```bash
npm install
npm run lint
npm run db:generate
npm run db:push
npm run dev
```

## Local Data

- Prisma schema: `prisma/schema.prisma`
- Prisma config: `prisma.config.ts`
- Database file: `data/dinner-decider.sqlite`
- Schema sync script: `scripts/prisma-sync.mjs`

`npm run db:push` uses `scripts/prisma-sync.mjs` instead of the default Prisma push flow. If the existing SQLite file cannot be diffed safely, the script backs it up into `data/backups/` before recreating the schema.

## Code Map

- `app/page.tsx`: landing page for create/join family
- `app/family/page.tsx`: main family workspace
- `app/history/page.tsx`: meal history and feedback review
- `app/settings/page.tsx`: member and family settings
- `app/actions.ts`: server actions used by forms
- `lib/data.ts`: core business logic and Prisma reads/writes
- `lib/prisma.ts`: Prisma client and SQLite adapter bootstrap
- `lib/session.ts`: cookie session read/write
- `lib/constants.ts`: labels, presets, seeded recipes, timezone
- `components/ui.tsx`: shared UI primitives

## Working Conventions

- Keep business rules in `lib/data.ts`; keep route files mostly focused on rendering.
- Prefer server actions from `app/actions.ts` for write operations triggered by forms.
- Preserve the app timezone defined in `lib/constants.ts` (`Asia/Shanghai`) when changing date logic.
- Session state is derived from the `dinner-decider-session` cookie in `lib/session.ts`.
- Seed recipes are defined in `lib/constants.ts` and inserted when a family is created.
- Database files are local artifacts and should not be committed.

## First-Run Checklist

1. Install dependencies with `npm install`.
2. Generate the Prisma client with `npm run db:generate`.
3. Sync the local SQLite schema with `npm run db:push`.
4. Start the app with `npm run dev`.
