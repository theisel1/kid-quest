from datetime import datetime
from pathlib import Path
import sys

from bson import ObjectId


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from kid_quest.books import build_book_document
from kid_quest.db import ensure_indexes, get_db


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def build_reading_session(book: dict, date_value: str, minutes: int, pages_read: int) -> dict:
    return {
        "_id": ObjectId(),
        "bookId": book["_id"],
        "bookTitle": book["title"],
        "date": parse_datetime(date_value),
        "minutes": minutes,
        "pagesRead": pages_read,
    }


def build_math_game(played_at: str, score: int, attempts: int, questions: list[dict]) -> dict:
    return {
        "_id": ObjectId(),
        "playedAt": parse_datetime(played_at),
        "score": score,
        "attempts": attempts,
        "questions": questions,
    }


def main():
    database = get_db()
    ensure_indexes()

    books_collection = database["books"]
    kids_collection = database["kids"]

    books_collection.delete_many({})
    kids_collection.delete_many({})

    seed_books = [
        build_book_document("Charlotte's Web", "E. B. White", "Level M", 192),
        build_book_document("The Wild Robot", "Peter Brown", "Level N", 320),
        build_book_document("Magic Tree House: Dinosaurs Before Dark", "Mary Pope Osborne", "Level K", 96),
        build_book_document("I Survived the Great Chicago Fire", "Lauren Tarshis", "Level O", 112),
    ]

    insert_result = books_collection.insert_many(seed_books)
    books = list(books_collection.find({"_id": {"$in": insert_result.inserted_ids}}))
    book_map = {book["slug"]: book for book in books}

    sample_kids = [
        {
            "name": "Ava",
            "slug": "ava",
            "age": 8,
            "avatarColor": "#f97316",
            "reading": {
                "currentBooks": [
                    {
                        "bookId": book_map["charlotte-s-web-e-b-white"]["_id"],
                        "currentPage": 74,
                    },
                    {
                        "bookId": book_map["the-wild-robot-peter-brown"]["_id"],
                        "currentPage": 112,
                    },
                ],
                "sessions": [
                    build_reading_session(book_map["charlotte-s-web-e-b-white"], "2026-03-12T00:00:00", 20, 12),
                    build_reading_session(book_map["the-wild-robot-peter-brown"], "2026-03-13T00:00:00", 25, 15),
                    build_reading_session(book_map["charlotte-s-web-e-b-white"], "2026-03-14T00:00:00", 18, 10),
                    build_reading_session(book_map["the-wild-robot-peter-brown"], "2026-03-15T00:00:00", 22, 14),
                ],
            },
            "math": {
                "games": [
                    build_math_game(
                        "2026-03-13T16:00:00.000Z",
                        8,
                        12,
                        [
                            {"prompt": "7 + 5", "topic": "addition", "answer": 12, "userAnswer": 12, "correct": True, "attempts": 1},
                            {"prompt": "14 - 6", "topic": "subtraction", "answer": 8, "userAnswer": 8, "correct": True, "attempts": 1},
                            {"prompt": "3 x 4", "topic": "multiplication", "answer": 12, "userAnswer": 12, "correct": True, "attempts": 1},
                            {"prompt": "9 + 8", "topic": "addition", "answer": 17, "userAnswer": 17, "correct": True, "attempts": 1},
                            {"prompt": "12 - 5", "topic": "subtraction", "answer": 7, "userAnswer": 9, "correct": False, "attempts": 2},
                            {"prompt": "6 x 2", "topic": "multiplication", "answer": 12, "userAnswer": 12, "correct": True, "attempts": 1},
                            {"prompt": "10 + 6", "topic": "addition", "answer": 16, "userAnswer": 16, "correct": True, "attempts": 1},
                            {"prompt": "15 - 7", "topic": "subtraction", "answer": 8, "userAnswer": 8, "correct": True, "attempts": 1},
                            {"prompt": "5 x 5", "topic": "multiplication", "answer": 25, "userAnswer": 20, "correct": False, "attempts": 2},
                            {"prompt": "11 + 4", "topic": "addition", "answer": 15, "userAnswer": 15, "correct": True, "attempts": 1},
                        ],
                    ),
                    build_math_game(
                        "2026-03-15T17:30:00.000Z",
                        9,
                        11,
                        [
                            {"prompt": "8 + 7", "topic": "addition", "answer": 15, "userAnswer": 15, "correct": True, "attempts": 1},
                            {"prompt": "16 - 9", "topic": "subtraction", "answer": 7, "userAnswer": 7, "correct": True, "attempts": 1},
                            {"prompt": "4 x 3", "topic": "multiplication", "answer": 12, "userAnswer": 12, "correct": True, "attempts": 1},
                            {"prompt": "13 + 5", "topic": "addition", "answer": 18, "userAnswer": 18, "correct": True, "attempts": 1},
                            {"prompt": "11 - 4", "topic": "subtraction", "answer": 7, "userAnswer": 7, "correct": True, "attempts": 1},
                            {"prompt": "7 x 2", "topic": "multiplication", "answer": 14, "userAnswer": 14, "correct": True, "attempts": 1},
                            {"prompt": "6 + 9", "topic": "addition", "answer": 15, "userAnswer": 15, "correct": True, "attempts": 1},
                            {"prompt": "18 - 8", "topic": "subtraction", "answer": 10, "userAnswer": 10, "correct": True, "attempts": 1},
                            {"prompt": "3 x 6", "topic": "multiplication", "answer": 18, "userAnswer": 18, "correct": True, "attempts": 1},
                            {"prompt": "9 + 9", "topic": "addition", "answer": 18, "userAnswer": 16, "correct": False, "attempts": 2},
                        ],
                    ),
                ]
            },
        },
        {
            "name": "Leo",
            "slug": "leo",
            "age": 10,
            "avatarColor": "#0f766e",
            "reading": {
                "currentBooks": [
                    {
                        "bookId": book_map["magic-tree-house-dinosaurs-before-dark-mary-pope-osborne"]["_id"],
                        "currentPage": 61,
                    },
                    {
                        "bookId": book_map["i-survived-the-great-chicago-fire-lauren-tarshis"]["_id"],
                        "currentPage": 48,
                    },
                ],
                "sessions": [
                    build_reading_session(
                        book_map["magic-tree-house-dinosaurs-before-dark-mary-pope-osborne"],
                        "2026-03-11T00:00:00",
                        16,
                        8,
                    ),
                    build_reading_session(
                        book_map["i-survived-the-great-chicago-fire-lauren-tarshis"],
                        "2026-03-13T00:00:00",
                        21,
                        11,
                    ),
                    build_reading_session(
                        book_map["magic-tree-house-dinosaurs-before-dark-mary-pope-osborne"],
                        "2026-03-14T00:00:00",
                        17,
                        9,
                    ),
                ],
            },
            "math": {
                "games": [
                    build_math_game(
                        "2026-03-12T18:15:00.000Z",
                        7,
                        13,
                        [
                            {"prompt": "5 + 6", "topic": "addition", "answer": 11, "userAnswer": 11, "correct": True, "attempts": 1},
                            {"prompt": "13 - 7", "topic": "subtraction", "answer": 6, "userAnswer": 4, "correct": False, "attempts": 2},
                            {"prompt": "2 x 8", "topic": "multiplication", "answer": 16, "userAnswer": 16, "correct": True, "attempts": 1},
                            {"prompt": "9 + 3", "topic": "addition", "answer": 12, "userAnswer": 12, "correct": True, "attempts": 1},
                            {"prompt": "15 - 6", "topic": "subtraction", "answer": 9, "userAnswer": 9, "correct": True, "attempts": 1},
                            {"prompt": "4 x 5", "topic": "multiplication", "answer": 20, "userAnswer": 20, "correct": True, "attempts": 1},
                            {"prompt": "8 + 8", "topic": "addition", "answer": 16, "userAnswer": 14, "correct": False, "attempts": 2},
                            {"prompt": "12 - 3", "topic": "subtraction", "answer": 9, "userAnswer": 9, "correct": True, "attempts": 1},
                            {"prompt": "7 x 3", "topic": "multiplication", "answer": 21, "userAnswer": 21, "correct": True, "attempts": 1},
                            {"prompt": "10 + 5", "topic": "addition", "answer": 15, "userAnswer": 12, "correct": False, "attempts": 2},
                        ],
                    )
                ]
            },
        },
    ]

    kids_collection.insert_many(sample_kids)
    print("Seeded 2 kid profiles for Kid Quest.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Failed to seed Kid Quest: {error}")
        raise
