# Kid Quest

Kid Quest is a small MVP for tracking reading sessions and math practice for kids. It is built with FastAPI, PyMongo, MongoDB Atlas, and a simple HTML/CSS/JavaScript frontend.

The goal is a working demo that is easy to explain in an interview:

- pick a child profile
- log reading sessions
- generate and save math games
- show a parent dashboard with recent activity and rollup stats

## Why MongoDB fits this app

MongoDB works reasonably well here because most of the app is centered around one child at a time. A child has a small profile plus activity history that is naturally grouped together.

This app uses a hybrid model:

- `kids` stores each child plus embedded reading sessions and math games
- `books` stores shared book metadata such as title, author, level, and total pages

That keeps the data model simple while still showing both embedding and references.

## MongoDB design decisions in plain English

- A kid is the main document because the UI mostly loads one child and their activity together.
- Current book progress stays on the kid document because progress is specific to that child.
- Books live in their own collection because multiple kids can reference the same title.
- Reading sessions stay embedded under the kid because they are appended often and usually shown with that child.
- Math games stay embedded too, and each game embeds its 10 question results.
- The app creates useful indexes on kid slugs, book slugs, reading session dates, and math game dates.
- The parent dashboard uses a MongoDB aggregation pipeline to calculate math accuracy by topic from embedded question results.

## Features

- Reading mode
  - show current books
  - log a reading session with date, minutes, and pages read
  - show total reading minutes and reading streak
- Math mode
  - generate 10 simple questions
  - save each game with score and attempts
  - track accuracy by topic
- Parent dashboard
  - recent activity
  - total reading minutes
  - reading streak
  - math accuracy by topic
- Seed data for 2 kids

## Project structure

```text
kid_quest/
  books.py
  db.py
  math_utils.py
  service.py
scripts/
  seed.py
  migrate_books.py
static/
templates/
main.py
requirements.txt
```

## Setup

1. Create and activate a virtual environment:

```bash
python3 -m venv .venv
. .venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy the example environment file and add your MongoDB Atlas URI:

```bash
cp .env.example .env.local
```

Example:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/kid-quest?retryWrites=true&w=majority
MONGODB_DB_NAME=kid-quest
```

4. Seed the database:

```bash
python scripts/seed.py
```

Note: `scripts/seed.py` clears the `kids` and `books` collections in the configured database before inserting the sample data.

If you already have older data where books were embedded directly under kids, run this once instead:

```bash
python scripts/migrate_books.py
```

5. Start the app:

```bash
uvicorn main:app --reload --port 3000
```

6. Open [http://localhost:3000](http://localhost:3000)

## API routes

- `GET /api/kids`
- `GET /api/kids/{kidId}`
- `POST /api/kids/{kidId}/reading-sessions`
- `GET /api/kids/{kidId}/math-questions`
- `POST /api/kids/{kidId}/math-games`
- `GET /api/kids/{kidId}/dashboard`

## Notes

- The app uses PyMongo directly instead of an ODM to keep the Python version small and easy to explain.
- MongoDB indexes are created automatically when the app starts or when the scripts run.
- The UI is intentionally simple. The focus is the working demo and the MongoDB data model, not production polish.
- For a larger production app, you would likely move very large activity histories into separate collections and add authentication.
