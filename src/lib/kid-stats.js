import { Types } from "mongoose";

import Kid from "@/models/Kid";

function toDayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function calculateReadingStreak(sessions = []) {
  const uniqueDays = [...new Set(sessions.map((session) => toDayKey(session.date)))].sort().reverse();

  if (!uniqueDays.length) {
    return 0;
  }

  let streak = 1;
  let previousDate = new Date(uniqueDays[0]);

  for (const dayKey of uniqueDays.slice(1)) {
    const currentDate = new Date(dayKey);
    const dayGap = Math.round((previousDate - currentDate) / 86400000);

    if (dayGap !== 1) {
      break;
    }

    streak += 1;
    previousDate = currentDate;
  }

  return streak;
}

export function totalReadingMinutes(sessions = []) {
  return sessions.reduce((sum, session) => sum + session.minutes, 0);
}

function toObjectId(kidId) {
  if (!Types.ObjectId.isValid(kidId)) {
    return null;
  }

  return new Types.ObjectId(kidId);
}

export function buildMathAccuracyPipeline(kidId) {
  const objectId = toObjectId(kidId);

  return [
    { $match: { _id: objectId } },
    { $unwind: { path: "$math.games", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$math.games.questions", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$math.games.questions.topic",
        totalQuestions: {
          $sum: {
            $cond: [{ $ifNull: ["$math.games.questions.topic", false] }, 1, 0],
          },
        },
        correctAnswers: {
          $sum: {
            $cond: ["$math.games.questions.correct", 1, 0],
          },
        },
      },
    },
    { $match: { _id: { $ne: null } } },
    {
      $project: {
        _id: 0,
        topic: "$_id",
        totalQuestions: 1,
        correctAnswers: 1,
        accuracy: {
          $round: [
            {
              $multiply: [{ $divide: ["$correctAnswers", "$totalQuestions"] }, 100],
            },
            1,
          ],
        },
      },
    },
    { $sort: { topic: 1 } },
  ];
}

export function buildRecentActivityPipeline(kidId, limit = 8) {
  const objectId = toObjectId(kidId);

  return [
    { $match: { _id: objectId } },
    {
      $project: {
        activity: {
          $concatArrays: [
            {
              $map: {
                input: "$reading.sessions",
                as: "session",
                in: {
                  type: "reading",
                  date: "$$session.date",
                  bookTitle: "$$session.bookTitle",
                  minutes: "$$session.minutes",
                  pagesRead: "$$session.pagesRead",
                },
              },
            },
            {
              $map: {
                input: "$math.games",
                as: "game",
                in: {
                  type: "math",
                  date: "$$game.playedAt",
                  score: "$$game.score",
                  attempts: "$$game.attempts",
                },
              },
            },
          ],
        },
      },
    },
    { $unwind: "$activity" },
    { $replaceRoot: { newRoot: "$activity" } },
    { $sort: { date: -1 } },
    { $limit: limit },
  ];
}

export async function getDashboardStats(kidId) {
  const kid = await Kid.findById(kidId).lean();

  if (!kid) {
    return null;
  }

  const sessions = kid.reading?.sessions ?? [];
  const [accuracyByTopic, recentActivity] = await Promise.all([
    Kid.aggregate(buildMathAccuracyPipeline(kidId)),
    Kid.aggregate(buildRecentActivityPipeline(kidId)),
  ]);

  return {
    totalReadingMinutes: totalReadingMinutes(sessions),
    readingStreak: calculateReadingStreak(sessions),
    mathAccuracyByTopic: accuracyByTopic,
    recentActivity: recentActivity.map((item) => ({
      ...item,
      label:
        item.type === "reading"
          ? `Read ${item.minutes} min and ${item.pagesRead} pages in ${item.bookTitle}`
          : `Finished a math game with ${item.score}/10 correct`,
    })),
  };
}
