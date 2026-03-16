import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
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
    const bookTitle = typeof body.bookTitle === "string" ? body.bookTitle.trim() : "";

    if (!date || Number.isNaN(date.getTime())) {
      return Response.json({ error: "A valid date is required." }, { status: 400 });
    }

    if (!bookTitle || minutes <= 0 || pagesRead < 0) {
      return Response.json(
        { error: "Book title, minutes, and pages read are required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const kid = await Kid.findById(kidId);

    if (!kid) {
      return Response.json({ error: "Kid not found." }, { status: 404 });
    }

    kid.reading.sessions.push({
      date,
      minutes,
      pagesRead,
      bookTitle,
    });

    const matchingBook = kid.reading.currentBooks.find((book) => book.title === bookTitle);

    if (matchingBook) {
      matchingBook.currentPage = Math.min(
        matchingBook.totalPages,
        matchingBook.currentPage + pagesRead
      );
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
