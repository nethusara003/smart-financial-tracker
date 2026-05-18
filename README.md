# Smart Financial Tracker (SFT)

[![CI Pipeline](https://github.com/nethusara003/smart-financial-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/nethusara003/smart-financial-tracker/actions/workflows/ci.yml)

**A comprehensive financial management platform built with modern technology stack**

SFT is a professional-grade personal finance tracking application that helps users manage their income, expenses, budgets, and financial goals with advanced analytics and secure data management.

A full-stack personal finance management system built using the MERN stack.

## Features
- User authentication (JWT)
- Add, edit, delete income and expense transactions
- Daily & weekly financial comparisons
- Interactive charts (Income vs Expense)
- Budget tracking with insights

## Tech Stack
- Frontend: React, Vite, Recharts
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT

## Project Structure

The project is organized into several key modules:

- `frontend/`: React + Vite web application.
- `backend/`: Node.js + Express.js API server.
- `ml-service/`: Python Flask service for financial forecasting and ML features.
- `docs/`: Comprehensive project documentation and reports.
  - `docs/reports/`: Academic reports and abstracts.
  - `docs/guides/`: Technical implementation guides and manuals.
  - `docs/archive/`: Legacy documentation and notes.
- `scripts/`: Utility scripts for development, testing, and deployment.
- `tests/`: End-to-end test suite using Playwright.

## Documentation Index

Detailed documentation for various features can be found in the `docs/` directory:

- [System Architecture](docs/guides/ARCHITECTURE.md)
- [Deployment Guide](docs/guides/DEPLOYMENT_CONFIGURATION_GUIDE.md)
- [ML Service Documentation](docs/guides/STAGE5_ADVANCED_FEATURES_IMPLEMENTATION_GUIDE.md)
- [Testing Guide](docs/guides/P2P_TRANSFER_TESTING_GUIDE_FRONTEND.md)

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm run install-all
   ```

2. **Setup Environment Variables:**
   Copy `.env.example` in both `frontend` and `backend` directories to `.env` and fill in the required values.

3. **Run Locally:**
   ```bash
   npm run dev
   ```

4. **Run E2E Tests:**
   ```bash
   npm run test:e2e
   ```

