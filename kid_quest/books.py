import re


def create_book_slug(title: str, author: str) -> str:
    slug = f"{title}-{author}".lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def build_book_document(title: str, author: str, level: str, total_pages: int) -> dict:
    return {
        "title": title.strip(),
        "author": author.strip(),
        "level": level.strip(),
        "totalPages": int(total_pages),
        "slug": create_book_slug(title, author),
    }
