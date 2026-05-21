# Smart Financial Tracker (SFT)

[![CI Pipeline](https://github.com/nethusara003/smart-financial-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/nethusara003/smart-financial-tracker/actions/workflows/ci.yml)

Smart Financial Tracker (SFT) is a full-stack personal finance application maintained in this repository. The project contains a frontend web client, a Node.js API backend, and an ML service used for forecasting.

## What is in this repository (verified)
- Frontend: a React application built with Vite (see [frontend/](frontend)).
- Backend: a Node.js + Express API with Mongoose models and controllers (see [backend/](backend)).
- ML service: Python Flask-based service and scripts (see [ml-service/](ml-service)).
- End-to-end tests using Playwright are included under `tests/e2e` and Playwright configuration and reports are present.

## Key scripts (root `package.json`)
- `npm run install-all` — install dependencies for `backend` and `frontend`.
- `npm run dev` — starts both backend and frontend concurrently (developer mode).
- `npm run dev:frontend` — start only the frontend dev server.
- `npm run dev:backend` — start only the backend dev server.
- `npm run test:e2e` — run Playwright end-to-end tests.
- `npm run docker:up` / `npm run docker:down` / `npm run docker:build` — docker-compose convenience scripts.

These scripts match the `scripts` section in the repository root `package.json`.

## Quick start (local)
1. Install both projects' dependencies:

   npm run install-all

2. Copy environment files and configure credentials:

   - Create `.env` in both `backend/` and `frontend/` from the provided examples and set `MONGO_URI`, API keys, and other required variables.

3. Start both servers locally:

   npm run dev

4. Run end-to-end tests (optional):

   npm run test:e2e

## Where to look next
- Backend API code: [backend/controllers](backend/controllers) and [backend/models](backend/models).
- Frontend pages & components: [frontend/src](frontend/src).
- ML code: [ml-service/app.py](ml-service/app.py) and related scripts.



