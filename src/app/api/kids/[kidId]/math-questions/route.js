import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { generateMathQuestions } from "@/lib/math";
import Kid from "@/models/Kid";

export async function GET(_request, { params }) {
  const { kidId } = await params;

  if (!Types.ObjectId.isValid(kidId)) {
    return Response.json({ error: "Invalid kid id." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const kid = await Kid.exists({ _id: kidId });

    if (!kid) {
      return Response.json({ error: "Kid not found." }, { status: 404 });
    }

    return Response.json({ questions: generateMathQuestions(10) });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to generate math questions." },
      { status: 500 }
    );
  }
}
