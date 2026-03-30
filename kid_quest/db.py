import os
from functools import lru_cache
from pathlib import Path

import certifi
from dotenv import load_dotenv
from pymongo import ASCENDING, DESCENDING, MongoClient


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR / ".env.local", override=True)


@lru_cache(maxsize=1)
def get_client():
    mongodb_uri = os.getenv("MONGODB_URI")

    if not mongodb_uri:
        raise RuntimeError("Missing MONGODB_URI. Add it to .env.local before starting the app.")

    return MongoClient(
        mongodb_uri,
        serverSelectionTimeoutMS=5000,
        tlsCAFile=certifi.where(),
    )


def get_db():
    return get_client()[os.getenv("MONGODB_DB_NAME", "kid-quest")]


def ensure_indexes():
    database = get_db()
    database["kids"].create_index([("slug", ASCENDING)], unique=True)
    database["kids"].create_index([("reading.sessions.date", DESCENDING)])
    database["kids"].create_index([("math.games.playedAt", DESCENDING)])
    database["books"].create_index([("slug", ASCENDING)], unique=True)
    database["books"].create_index([("title", ASCENDING), ("author", ASCENDING)])
