import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import Book from "@/models/Book";
import Kid from "@/models/Kid";

export async function POST(request, { params }) {
  const { kidId } = await params;

  if (!Types.ObjectId.isValid(kidId)) {
    return Response.json({ error: "Invalid kid id." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const date = body.date ? new Date(body.date) : null;
    const minutes = Number(body.minutes);
    const pagesRead = Number(body.pagesRead);
    const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";

    if (!date || Number.isNaN(date.getTime())) {
      return Response.json({ error: "A valid date is required." }, { status: 400 });
    }

    if (!Types.ObjectId.isValid(bookId) || minutes <= 0 || pagesRead < 0) {
      return Response.json(
        { error: "Book, minutes, and pages read are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const kid = await Kid.findById(kidId);

    if (!kid) {
      return Response.json({ error: "Kid not found." }, { status: 404 });
    }

    const book = await Book.findById(bookId).lean();

    if (!book) {
      return Response.json({ error: "Book not found." }, { status: 404 });
    }

    kid.reading.sessions.push({
      bookId,
      date,
      minutes,
      pagesRead,
      bookTitle: book.title,
    });

    const matchingBook = kid.reading.currentBooks.find(
      (currentBook) => currentBook.bookId?.toString() === bookId
    );

    if (matchingBook) {
      matchingBook.currentPage = Math.min(book.totalPages, matchingBook.currentPage + pagesRead);
    }

    await kid.save();

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to save the reading session." },
      { status: 500 }
    );
  }
}
