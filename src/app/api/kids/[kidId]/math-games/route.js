import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { SUPPORTED_TOPICS } from "@/lib/math";
import Kid from "@/models/Kid";

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request, { params }) {
  const { kidId } = await params;

  if (!Types.ObjectId.isValid(kidId)) {
    return Response.json({ error: "Invalid kid id." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const rawQuestions = Array.isArray(body.questions) ? body.questions : [];

    if (rawQuestions.length !== 10) {
      return Response.json(
        { error: "Each game must include exactly 10 questions." },
        { status: 400 }
      );
    }

    const questions = rawQuestions.map((question) => {
      const prompt = typeof question.prompt === "string" ? question.prompt.trim() : "";
      const topic = typeof question.topic === "string" ? question.topic : "";
      const answer = normalizeNumber(question.answer);
      const userAnswer = normalizeNumber(question.userAnswer);
      const attempts = Math.max(1, Number(question.attempts) || 1);
      const correct = userAnswer !== null && answer !== null && userAnswer === answer;

      if (!prompt || !SUPPORTED_TOPICS.includes(topic) || answer === null) {
        throw new Error("One or more questions are invalid.");
      }

      return {
        prompt,
        topic,
        answer,
        userAnswer,
        attempts,
        correct,
      };
    });

    await connectToDatabase();

    const kid = await Kid.findById(kidId);

    if (!kid) {
      return Response.json({ error: "Kid not found." }, { status: 404 });
    }

    const score = questions.filter((question) => question.correct).length;
    const attempts = questions.reduce((sum, question) => sum + question.attempts, 0);

    kid.math.games.push({
      playedAt: body.playedAt ? new Date(body.playedAt) : new Date(),
      score,
      attempts,
      questions,
    });

    await kid.save();

    return Response.json(
      {
        success: true,
        game: {
          score,
          attempts,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to save the math game." },
      { status: 500 }
    );
  }
}
