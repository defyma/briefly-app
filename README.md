# Briefly

Briefly is a productivity app built for the `pollinations.ai` showcase.

It combines three practical AI tools in one workspace:
- `Meeting Notes`
- `Task Breakdown`
- `Reply Draft`

The goal is simple: turn messy input into usable output fast.

## What Briefly Does

### 1. Meeting Notes
Input:
- pasted meeting notes
- rough transcript

Output:
- summary
- decisions
- action items
- open questions

### 2. Task Breakdown
Input:
- a big goal or project target

Output:
- step-by-step tasks
- priorities
- execution order
- simple checklist

### 3. Reply Draft
Input:
- email, chat, or message context

Output:
- concise reply draft
- tone options
- follow-up message

## Product Direction

Briefly is designed to feel:
- practical
- fast
- clean
- showcase-friendly

It is intentionally not a generic chatbot. Each tool is focused on producing a structured result that can be used immediately.

## Pollinations Integration

Briefly is built around the `pollinations.ai` ecosystem and is planned for `Bring Your Own Pollen (BYOP)` usage.

Current behavior:
- if a Pollinations token is available, Briefly sends generation requests through the local Next.js API route
- if no token is available, Briefly falls back to local structured output so the workspace still works as an MVP

References:
- Showcase: https://pollinations.ai/apps
- BYOP docs: https://gen.pollinations.ai/docs#tag/bring-your-own-pollen
- Pollinations: https://pollinations.ai

## Tech Stack

- `Next.js`
- `TypeScript`
- `Tailwind CSS`

Main app structure:
- `/` landing page
- `/app` main workspace
- `/api/generate` generation route

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Environment Variables

Copy `.env.example` into `.env.local` if needed.

Available variables:

```bash
NEXT_PUBLIC_POLLINATIONS_CLIENT_ID=
POLLINATIONS_API_KEY=
POLLINATIONS_TEXT_MODEL=
```

Notes:
- `NEXT_PUBLIC_POLLINATIONS_CLIENT_ID` is the Pollinations App Key (`pk_...`) used for the official BYOP redirect flow
- `POLLINATIONS_API_KEY` lets the server route call Pollinations without requiring a token from the browser
- users can also paste their own token in the app for BYOP usage
- `POLLINATIONS_TEXT_MODEL` is optional and can be used if you want to force a specific model

Recommended Redirect URIs for this app:

```text
https://briefly-app.defyma.com/app
http://localhost:3000/app
```

## Verification

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

## Deployment

This repo is set up so Docker images can be built by GitHub Actions and pushed to GitHub Container Registry.

Included files:
- `Dockerfile`
- `.dockerignore`
- `.github/workflows/docker-publish.yml`
- `docker-compose.yml`

Expected flow:
1. push to `main`
2. GitHub Actions builds the image
3. image is pushed to `ghcr.io/<owner>/<repo>`
4. server runs `docker compose pull && docker compose up -d`

Default image reference in `docker-compose.yml`:

```yaml
ghcr.io/defyma/briefly-app:latest
```

Before using it on the server:
- make sure the GitHub repository owner and package name match the image path you want
- create a `.env` file on the server with the production environment variables
- if the GHCR package is private, log in first with `docker login ghcr.io`

## Current MVP Status

Implemented:
- landing page for Briefly
- workspace for 3 tools
- local BYOP token input
- `/api/generate` route
- structured fallback output when live Pollinations access is unavailable

Next:
- improve prompt quality per tool
- polish BYOP onboarding
- add deployment container setup
