import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { toClientBook } from "@/lib/books";
import Book from "@/models/Book";
import Kid from "@/models/Kid";

export async function GET(_request, { params }) {
  const { kidId } = await params;

  if (!Types.ObjectId.isValid(kidId)) {
    return Response.json({ error: "Invalid kid id." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const kid = await Kid.findById(kidId)
      .populate({ path: "reading.currentBooks.bookId", model: Book })
      .lean();

    if (!kid) {
      return Response.json({ error: "Kid not found." }, { status: 404 });
    }

    const readingSessions = [...(kid.reading?.sessions ?? [])]
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, 6);

    const mathGames = [...(kid.math?.games ?? [])]
      .sort((left, right) => new Date(right.playedAt) - new Date(left.playedAt))
      .slice(0, 4)
      .map((game) => ({
        id: game._id.toString(),
        playedAt: game.playedAt,
        score: game.score,
        attempts: game.attempts,
      }));

    const currentBooks = (kid.reading?.currentBooks ?? [])
      .map((entry) => toClientBook(entry))
      .filter(Boolean);

    return Response.json({
      kid: {
        id: kid._id.toString(),
        name: kid.name,
        age: kid.age,
        slug: kid.slug,
        avatarColor: kid.avatarColor,
        currentBooks,
        readingSessions,
        mathGames,
        mathGameCount: kid.math?.games?.length ?? 0,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to load the kid profile." },
      { status: 500 }
    );
  }
}
