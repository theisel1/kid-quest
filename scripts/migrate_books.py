from pathlib import Path
import sys

from bson import ObjectId
from pymongo import ReturnDocument


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from kid_quest.books import build_book_document
from kid_quest.db import ensure_indexes, get_db


def ensure_book(books_collection, details: dict) -> dict:
    book_document = build_book_document(
        details.get("title") or "Unknown Book",
        details.get("author") or "Unknown Author",
        details.get("level") or "Unknown Level",
        int(details.get("totalPages") or max(int(details.get("pagesRead") or 1), 1)),
    )

    return books_collection.find_one_and_update(
        {"slug": book_document["slug"]},
        {"$setOnInsert": book_document},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )


def normalize_object_id(value):
    if isinstance(value, ObjectId):
        return value

    if isinstance(value, str) and ObjectId.is_valid(value):
        return ObjectId(value)

    return None


def main():
    database = get_db()
    ensure_indexes()

    kids_collection = database["kids"]
    books_collection = database["books"]

    raw_kids = list(kids_collection.find({}))
    updated_kids = 0

    for kid in raw_kids:
        reading = kid.get("reading", {})
        current_books = reading.get("currentBooks", [])
        sessions = reading.get("sessions", [])
        title_to_book_id = {}
        changed = False

        next_current_books = []
        for current_book in current_books:
            current_book_id = normalize_object_id(current_book.get("bookId"))
            if current_book_id:
                next_current_books.append(
                    {
                        "bookId": current_book_id,
                        "currentPage": current_book.get("currentPage", 0),
                    }
                )
                continue

            book = ensure_book(books_collection, current_book)
            title_to_book_id[current_book.get("title")] = book["_id"]
            next_current_books.append(
                {
                    "bookId": book["_id"],
                    "currentPage": current_book.get("currentPage", 0),
                }
            )
            changed = True

        next_sessions = []
        for session in sessions:
            session_book_id = normalize_object_id(session.get("bookId"))
            if session_book_id:
                session["bookId"] = session_book_id
                next_sessions.append(session)
                continue

            book_id = title_to_book_id.get(session.get("bookTitle"))
            if not book_id:
                matching_book = next(
                    (book for book in current_books if book.get("title") == session.get("bookTitle")),
                    None,
                )
                book = ensure_book(
                    books_collection,
                    matching_book or {"title": session.get("bookTitle"), "pagesRead": session.get("pagesRead")},
                )
                book_id = book["_id"]

            next_sessions.append({**session, "bookId": book_id})
            changed = True

        if not changed:
            continue

        kids_collection.update_one(
            {"_id": kid["_id"]},
            {
                "$set": {
                    "reading.currentBooks": next_current_books,
                    "reading.sessions": next_sessions,
                }
            },
        )
        updated_kids += 1

    book_count = books_collection.count_documents({})
    print(f"Migrated {updated_kids} kid documents. Books collection now has {book_count} records.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Failed to migrate books: {error}")
        raise
