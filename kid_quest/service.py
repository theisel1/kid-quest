from datetime import datetime

from bson import ObjectId

from kid_quest.db import get_db
from kid_quest.math_utils import SUPPORTED_TOPICS


def _kids_collection():
    return get_db()["kids"]


def _books_collection():
    return get_db()["books"]


def ensure_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid id.")
    return ObjectId(value)


def _serialize_book(entry: dict, books_by_id: dict[str, dict]) -> dict | None:
    book_id = entry.get("bookId")
    book = books_by_id.get(str(book_id))

    if not book:
        return None

    return {
        "id": str(book["_id"]),
        "title": book["title"],
        "author": book["author"],
        "level": book["level"],
        "totalPages": book["totalPages"],
        "currentPage": entry.get("currentPage", 0),
    }


def _serialize_reading_session(session: dict) -> dict:
    return {
        "id": str(session.get("_id", "")),
        "bookId": str(session["bookId"]) if session.get("bookId") else None,
        "bookTitle": session["bookTitle"],
        "date": session["date"],
        "minutes": session["minutes"],
        "pagesRead": session["pagesRead"],
    }


def _serialize_math_game(game: dict) -> dict:
    return {
        "id": str(game.get("_id", "")),
        "playedAt": game["playedAt"],
        "score": game["score"],
        "attempts": game["attempts"],
    }


def kid_exists(kid_id: str) -> bool:
    object_id = ensure_object_id(kid_id)
    return _kids_collection().count_documents({"_id": object_id}, limit=1) == 1


def get_kid_overview() -> list[dict]:
    kids = _kids_collection().find({}, {"name": 1, "age": 1, "avatarColor": 1, "slug": 1, "reading.currentBooks": 1}).sort("name", 1)
    return [
        {
            "id": str(kid["_id"]),
            "name": kid["name"],
            "age": kid["age"],
            "slug": kid["slug"],
            "avatarColor": kid["avatarColor"],
            "currentBookCount": len(kid.get("reading", {}).get("currentBooks", [])),
        }
        for kid in kids
    ]


def get_kid_profile(kid_id: str) -> dict:
    object_id = ensure_object_id(kid_id)
    kid = _kids_collection().find_one({"_id": object_id})

    if not kid:
        raise LookupError("Kid not found.")

    book_ids = [entry.get("bookId") for entry in kid.get("reading", {}).get("currentBooks", []) if entry.get("bookId")]
    books = _books_collection().find({"_id": {"$in": book_ids}})
    books_by_id = {str(book["_id"]): book for book in books}

    current_books = [
        book
        for book in (
            _serialize_book(entry, books_by_id)
            for entry in kid.get("reading", {}).get("currentBooks", [])
        )
        if book
    ]

    reading_sessions = sorted(
        kid.get("reading", {}).get("sessions", []),
        key=lambda session: session["date"],
        reverse=True,
    )[:6]

    math_games = sorted(
        kid.get("math", {}).get("games", []),
        key=lambda game: game["playedAt"],
        reverse=True,
    )[:4]

    return {
        "id": str(kid["_id"]),
        "name": kid["name"],
        "age": kid["age"],
        "slug": kid["slug"],
        "avatarColor": kid["avatarColor"],
        "currentBooks": current_books,
        "readingSessions": [_serialize_reading_session(session) for session in reading_sessions],
        "mathGames": [_serialize_math_game(game) for game in math_games],
        "mathGameCount": len(kid.get("math", {}).get("games", [])),
    }


def log_reading_session(kid_id: str, payload: dict) -> None:
    object_id = ensure_object_id(kid_id)
    book_id = ensure_object_id(str(payload.get("bookId", "")))

    try:
        date_value = datetime.fromisoformat(str(payload.get("date", "")).replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("A valid date is required.") from error

    minutes = int(payload.get("minutes", 0))
    pages_read = int(payload.get("pagesRead", -1))

    if minutes <= 0 or pages_read < 0:
        raise ValueError("Book, minutes, and pages read are required.")

    kid = _kids_collection().find_one({"_id": object_id})
    if not kid:
        raise LookupError("Kid not found.")

    book = _books_collection().find_one({"_id": book_id})
    if not book:
        raise LookupError("Book not found.")

    current_books = kid.get("reading", {}).get("currentBooks", [])
    for entry in current_books:
        if entry.get("bookId") == book_id:
            entry["currentPage"] = min(book["totalPages"], entry.get("currentPage", 0) + pages_read)
            break

    kid.setdefault("reading", {}).setdefault("sessions", []).append(
        {
            "_id": ObjectId(),
            "bookId": book_id,
            "bookTitle": book["title"],
            "date": date_value,
            "minutes": minutes,
            "pagesRead": pages_read,
        }
    )

    _kids_collection().replace_one({"_id": object_id}, kid)


def save_math_game(kid_id: str, payload: dict) -> dict:
    object_id = ensure_object_id(kid_id)
    raw_questions = payload.get("questions", [])

    if not isinstance(raw_questions, list) or len(raw_questions) != 10:
        raise ValueError("Each game must include exactly 10 questions.")

    questions = []
    for question in raw_questions:
        prompt = str(question.get("prompt", "")).strip()
        topic = str(question.get("topic", "")).strip()

        try:
            answer = int(question.get("answer"))
        except (TypeError, ValueError) as error:
            raise ValueError("One or more questions are invalid.") from error

        user_answer = question.get("userAnswer")
        try:
            user_answer = int(user_answer) if user_answer not in ("", None) else None
        except (TypeError, ValueError):
            user_answer = None

        attempts = max(1, int(question.get("attempts", 1)))
        correct = user_answer is not None and user_answer == answer

        if not prompt or topic not in SUPPORTED_TOPICS:
            raise ValueError("One or more questions are invalid.")

        questions.append(
            {
                "prompt": prompt,
                "topic": topic,
                "answer": answer,
                "userAnswer": user_answer,
                "attempts": attempts,
                "correct": correct,
            }
        )

    kid = _kids_collection().find_one({"_id": object_id})
    if not kid:
        raise LookupError("Kid not found.")

    score = sum(1 for question in questions if question["correct"])
    attempts = sum(question["attempts"] for question in questions)
    played_at = payload.get("playedAt")
    if played_at:
        played_at = datetime.fromisoformat(str(played_at).replace("Z", "+00:00"))
    else:
        played_at = datetime.utcnow()

    kid.setdefault("math", {}).setdefault("games", []).append(
        {
            "_id": ObjectId(),
            "playedAt": played_at,
            "score": score,
            "attempts": attempts,
            "questions": questions,
        }
    )

    _kids_collection().replace_one({"_id": object_id}, kid)

    return {
        "score": score,
        "attempts": attempts,
    }


def _to_day_key(value: datetime) -> str:
    return value.date().isoformat()


def calculate_reading_streak(sessions: list[dict]) -> int:
    unique_days = sorted({_to_day_key(session["date"]) for session in sessions}, reverse=True)

    if not unique_days:
        return 0

    streak = 1
    previous_date = datetime.fromisoformat(unique_days[0])

    for day_key in unique_days[1:]:
        current_date = datetime.fromisoformat(day_key)
        day_gap = (previous_date - current_date).days
        if day_gap != 1:
            break
        streak += 1
        previous_date = current_date

    return streak


def total_reading_minutes(sessions: list[dict]) -> int:
    return sum(session["minutes"] for session in sessions)


def get_dashboard_stats(kid_id: str) -> dict:
    object_id = ensure_object_id(kid_id)
    kid = _kids_collection().find_one({"_id": object_id})

    if not kid:
        raise LookupError("Kid not found.")

    sessions = kid.get("reading", {}).get("sessions", [])

    accuracy_pipeline = [
        {"$match": {"_id": object_id}},
        {"$unwind": {"path": "$math.games", "preserveNullAndEmptyArrays": True}},
        {"$unwind": {"path": "$math.games.questions", "preserveNullAndEmptyArrays": True}},
        {
            "$group": {
                "_id": "$math.games.questions.topic",
                "totalQuestions": {
                    "$sum": {
                        "$cond": [{"$ifNull": ["$math.games.questions.topic", False]}, 1, 0]
                    }
                },
                "correctAnswers": {
                    "$sum": {"$cond": ["$math.games.questions.correct", 1, 0]}
                },
            }
        },
        {"$match": {"_id": {"$ne": None}}},
        {
            "$project": {
                "_id": 0,
                "topic": "$_id",
                "totalQuestions": 1,
                "correctAnswers": 1,
                "accuracy": {
                    "$round": [
                        {
                            "$multiply": [
                                {"$divide": ["$correctAnswers", "$totalQuestions"]},
                                100,
                            ]
                        },
                        1,
                    ]
                },
            }
        },
        {"$sort": {"topic": 1}},
    ]

    activity_pipeline = [
        {"$match": {"_id": object_id}},
        {
            "$project": {
                "activity": {
                    "$concatArrays": [
                        {
                            "$map": {
                                "input": "$reading.sessions",
                                "as": "session",
                                "in": {
                                    "type": "reading",
                                    "date": "$$session.date",
                                    "bookTitle": "$$session.bookTitle",
                                    "minutes": "$$session.minutes",
                                    "pagesRead": "$$session.pagesRead",
                                },
                            }
                        },
                        {
                            "$map": {
                                "input": "$math.games",
                                "as": "game",
                                "in": {
                                    "type": "math",
                                    "date": "$$game.playedAt",
                                    "score": "$$game.score",
                                    "attempts": "$$game.attempts",
                                },
                            }
                        },
                    ]
                }
            }
        },
        {"$unwind": "$activity"},
        {"$replaceRoot": {"newRoot": "$activity"}},
        {"$sort": {"date": -1}},
        {"$limit": 8},
    ]

    accuracy_by_topic = list(_kids_collection().aggregate(accuracy_pipeline))
    recent_activity = []
    for item in _kids_collection().aggregate(activity_pipeline):
        label = (
            f"Read {item['minutes']} min and {item['pagesRead']} pages in {item['bookTitle']}"
            if item["type"] == "reading"
            else f"Finished a math game with {item['score']}/10 correct"
        )
        recent_activity.append({**item, "label": label})

    return {
        "totalReadingMinutes": total_reading_minutes(sessions),
        "readingStreak": calculate_reading_streak(sessions),
        "mathAccuracyByTopic": accuracy_by_topic,
        "recentActivity": recent_activity,
    }
