# Sitewise

Voice-first safety reporting for field crews. Sitewise asks what your site usually forgets, learns from every record, and tracks where each fact came from.

Built for the Build North AI build sprint (Oct 16–25, 2026).

## Stack

Expo (React Native) · Clerk · Claude (Anthropic API) · SurrealDB

## Getting started

1. Install dependencies

```bash
   npm install
```

2. Copy the environment template and fill in your keys

```bash
   cp .env.example .env
```

3. Start the app

```bash
   npx expo start
```

   Scan the QR code with Expo Go (SDK 57).

## Data and privacy

All demo data is synthetic. No real worker, site, or incident data is used. API keys are kept server-side and never bundled into the app.

## Prior work disclosure

Scaffolded with `create-expo-app` (default Expo template, SDK 57). All other code written during Build Week.

## Status

🚧 In development