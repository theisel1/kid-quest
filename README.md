# Kid Quest

Kid Quest is a small MVP built with Next.js, MongoDB Atlas, and Mongoose. It tracks reading sessions and math games for kids, then rolls that data into a parent dashboard.

## Why MongoDB is used here

MongoDB is a reasonable fit here because each child has a small set of related data:

- current books
- reading session history
- math game history
- per-question math results

That makes a document model a practical choice. A single `Kid` document can hold the child profile plus the embedded arrays the app usually reads together. For this MVP, that keeps the queries straightforward and avoids splitting the data across multiple collections too early.

## MongoDB design decisions in plain English

- Each kid is stored as one document in the `kids` collection.
- `reading.currentBooks` is an embedded array because a child's active books are small, tightly related, and always shown with the child.
- `reading.sessions` is an embedded array because reading logs are usually fetched with the child profile and are easy to append.
- `math.games` is an embedded array, and each game embeds its 10 question results. That keeps one saved play session together.
- A multikey index on `reading.sessions.date` helps recent reading activity and streak-related lookups.
- A multikey index on `math.games.playedAt` helps recent math history lookups.
- The parent dashboard uses a MongoDB aggregation pipeline to unwind embedded math question results and calculate accuracy by topic.

## Features

- Two modes: Reading and Math
- Child profile picker
- Reading mode with current books, reading log form, total minutes, and streak
- Math mode with 10 generated questions, saved score + attempts, and topic accuracy
- Parent dashboard with recent activity, totals, streak, and math accuracy
- Seed data for 2 kids

## Project structure

```text
src/
  app/
    api/
  components/
  lib/
  models/
scripts/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file and add your MongoDB Atlas connection string:

```bash
cp .env.example .env.local
```

3. Seed the database with 2 sample kids:

```bash
npm run seed
```

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## API routes

- `GET /api/kids`
- `GET /api/kids/:kidId`
- `POST /api/kids/:kidId/reading-sessions`
- `GET /api/kids/:kidId/math-questions`
- `POST /api/kids/:kidId/math-games`
- `GET /api/kids/:kidId/dashboard`

## Implementation notes

- The schema is intentionally simple: one main collection and a few embedded arrays.
- Mongoose is used for schema validation and nested document modeling.
- The dashboard combines standard document reads with an aggregation pipeline for topic accuracy.
- For a production app, you might eventually split very large histories into separate collections, add auth, and validate math answers fully on the server.
