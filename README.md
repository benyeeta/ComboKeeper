# ComboKeeper

> A semi-automated score tracking and analysis dashboard for competitive osu! tournament teams.

ComboKeeper is a private web application that centralizes the tracking, aggregation, and analysis of player scores across tournament mappools, replacing the need for fragile, error-prone Google Sheets.

## ❌ The Problem

Managing an osu! tournament team requires extensive manual labor, from copy-pasting scores to maintaining fragile spreadsheets. This process is tedious, error-prone, and risks leaking sensitive team strategies. Captains often have an incomplete picture of player performance, especially on practice maps.

## ✨ Features

- **🔐 Secure OAuth Authentication**: Players log in via official osu! secure authentication.
- **📥 Flexible Score Import**: Due to osu! API limitations with automatic ScoreV2 tracking, ComboKeeper provides robust alternatives to gather your team's scores:
  - **MP Link Import**: Instantly pull in scores from multiplayer match history.
  - **`scores.db` Import**: Upload your local `scores.db` file to seamlessly sync offline or practice scores.
  - **Manual Entry**: Quick and easy manual score input for ad-hoc tracking.
- **📈 Automated Leaderboards**: Automatically filters, organizes, and ranks team scores by tournament stage and mod bracket.
- **📊 Tactical UI**: A dual-panel command center displays a mappool overview with "Quick Lineup" indicators and a detailed analytics panel with performance trend graphs (Sparklines).
- **🤫 Strict Privacy**: Access is gated. Only authenticated teammates can view the dashboard, ensuring all team data and strategies remain strictly confidential.

## 🛠️ Tech Stack

- Next.js - React Framework
- React - A JavaScript library for building user interfaces
- TypeScript - Typed JavaScript at Any Scale
- Geist - Font family for Vercel

## Getting Started

First, install dependencies and run the development server:

```bash
pnpm install
pnpm dev
# or
yarn install
yarn dev
# or
npm install
npm run dev
 # or
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
