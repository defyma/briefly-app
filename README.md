# Briefly

Briefly is a productivity workspace for turning messy input into clear action.

It focuses on fast, structured output instead of a generic chatbot flow:
- `Meeting Notes`
- `Task Breakdown`
- `Reply Draft`
- `Chat` for follow-up discussion and revision

## What It Does

### Meeting Notes
Turn rough notes or transcripts into:
- summary
- decisions
- action items
- open questions

### Task Breakdown
Turn a big goal into:
- steps
- priorities
- execution order
- checklist

### Reply Draft
Turn message context into:
- draft reply
- tone options
- follow-up

### Chat
Continue from any generated result:
- refine
- revise
- brainstorm next steps

## Pollinations Flow

Briefly uses Pollinations text generation through local Next.js API routes:
- `/api/generate`
- `/api/chat`

The app is built around the official Bring Your Own Pollen redirect flow.

Current BYOP setup:
- user clicks `Connect Pollinations`
- app redirects to Pollinations authorization
- Pollinations returns `#api_key=sk_...` to `/app`
- the key is stored in local storage on that browser
- the selected model is limited to the same allowed model list used during BYOP authorization

If no usable Pollinations key is available, Briefly falls back to local structured output.

## Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS v4`

## Routes

- `/` landing page
- `/app` main workspace
- `/api/generate` structured tool output
- `/api/chat` follow-up chat output

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Environment

Copy `.env.example` to `.env.local` for local development.

Available variables:

```bash
POLLINATIONS_CLIENT_ID=
NEXT_PUBLIC_POLLINATIONS_CLIENT_ID=
POLLINATIONS_API_KEY=
POLLINATIONS_TEXT_MODEL=
```

Notes:
- `POLLINATIONS_CLIENT_ID` is the recommended runtime env for Docker or server deploys
- `NEXT_PUBLIC_POLLINATIONS_CLIENT_ID` is the Pollinations App Key (`pk_...`) for the official BYOP connect flow
- `POLLINATIONS_API_KEY` is optional server-side fallback auth
- `POLLINATIONS_TEXT_MODEL` is optional if you want a server default model

Recommended redirect URIs:

```text
https://briefly-app.defyma.com/app
http://localhost:3000/app
```

## Verification

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

## Docker Deploy

This repo includes:
- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `.github/workflows/docker-publish.yml`

Default compose image:

```yaml
ghcr.io/defyma/briefly-app:latest
```

Workflow behavior:
- push to `main` triggers image build
- image is published to `ghcr.io/defyma/briefly-app`
- server can run `docker compose pull && docker compose up -d`

Example `docker-compose.yml` expects:

```yaml
services:
  briefly:
    image: ghcr.io/defyma/briefly-app:latest
    container_name: briefly-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
```

## Links

- App repo: `https://github.com/defyma/briefly-app`
- Pollinations: `https://pollinations.ai`
- Showcase: `https://pollinations.ai/apps`
- BYOP docs: `https://gen.pollinations.ai/docs#tag/bring-your-own-pollen`
