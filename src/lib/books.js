export function createBookSlug(title, author) {
  return `${title}-${author}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildBookDocument({ title, author, level, totalPages }) {
  return {
    title: title.trim(),
    author: author.trim(),
    level: level.trim(),
    totalPages: Number(totalPages),
    slug: createBookSlug(title, author),
  };
}

export function toClientBook(entry) {
  const book = entry?.bookId && typeof entry.bookId === "object" ? entry.bookId : null;

  if (book?.title) {
    return {
      id: book._id.toString(),
      title: book.title,
      author: book.author,
      level: book.level,
      totalPages: book.totalPages,
      currentPage: entry.currentPage,
    };
  }

  if (entry?.title) {
    return {
      id: entry._id?.toString?.() || createBookSlug(entry.title, entry.author || "book"),
      title: entry.title,
      author: entry.author,
      level: entry.level,
      totalPages: entry.totalPages,
      currentPage: entry.currentPage,
    };
  }

  return null;
}
