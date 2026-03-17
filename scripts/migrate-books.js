import mongoose from "mongoose";

import { connectToDatabase } from "../src/lib/db.js";
import { buildBookDocument } from "../src/lib/books.js";
import Book from "../src/models/Book.js";

async function ensureBook(details) {
  const bookDocument = buildBookDocument({
    title: details.title || "Unknown Book",
    author: details.author || "Unknown Author",
    level: details.level || "Unknown Level",
    totalPages: Number(details.totalPages) || Math.max(Number(details.pagesRead) || 1, 1),
  });

  return Book.findOneAndUpdate(
    { slug: bookDocument.slug },
    { $setOnInsert: bookDocument },
    { returnDocument: "after", upsert: true }
  );
}

async function migrate() {
  await connectToDatabase();

  const kidsCollection = mongoose.connection.db.collection("kids");
  const rawKids = await kidsCollection.find({}).toArray();
  let updatedKids = 0;

  for (const kid of rawKids) {
    const currentBooks = kid.reading?.currentBooks ?? [];
    const sessions = kid.reading?.sessions ?? [];
    const titleToBookId = new Map();
    let changed = false;

    const nextCurrentBooks = [];

    for (const currentBook of currentBooks) {
      if (currentBook.bookId) {
        nextCurrentBooks.push({
          bookId: currentBook.bookId,
          currentPage: currentBook.currentPage ?? 0,
        });
        continue;
      }

      const book = await ensureBook(currentBook);
      titleToBookId.set(currentBook.title, book._id.toString());
      nextCurrentBooks.push({
        bookId: book._id,
        currentPage: currentBook.currentPage ?? 0,
      });
      changed = true;
    }

    const nextSessions = [];

    for (const session of sessions) {
      if (session.bookId) {
        nextSessions.push(session);
        continue;
      }

      let bookId = titleToBookId.get(session.bookTitle);

      if (!bookId) {
        const matchingBook = currentBooks.find((book) => book.title === session.bookTitle);
        const book = await ensureBook(
          matchingBook || {
            title: session.bookTitle,
            pagesRead: session.pagesRead,
          }
        );

        bookId = book._id.toString();
      }

      nextSessions.push({
        ...session,
        bookId: new mongoose.Types.ObjectId(bookId),
      });
      changed = true;
    }

    if (!changed) {
      continue;
    }

    await kidsCollection.updateOne(
      { _id: kid._id },
      {
        $set: {
          "reading.currentBooks": nextCurrentBooks,
          "reading.sessions": nextSessions,
        },
      }
    );

    updatedKids += 1;
  }

  const bookCount = await Book.countDocuments();
  console.log(`Migrated ${updatedKids} kid documents. Books collection now has ${bookCount} records.`);
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to migrate books:", error);
    process.exit(1);
  });
