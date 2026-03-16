import mongoose from "mongoose";

const currentBookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    level: { type: String, required: true },
    totalPages: { type: Number, required: true, min: 1 },
    currentPage: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const readingSessionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    minutes: { type: Number, required: true, min: 1 },
    pagesRead: { type: Number, required: true, min: 0 },
    bookTitle: { type: String, required: true },
  },
  { _id: true }
);

const mathQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    topic: {
      type: String,
      required: true,
      enum: ["addition", "subtraction", "multiplication"],
    },
    answer: { type: Number, required: true },
    userAnswer: { type: Number, default: null },
    correct: { type: Boolean, required: true },
    attempts: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const mathGameSchema = new mongoose.Schema(
  {
    playedAt: { type: Date, required: true, default: Date.now },
    score: { type: Number, required: true, min: 0, max: 10 },
    attempts: { type: Number, required: true, min: 1 },
    questions: {
      type: [mathQuestionSchema],
      validate: {
        validator(questions) {
          return Array.isArray(questions) && questions.length === 10;
        },
        message: "Each math game must include exactly 10 questions.",
      },
    },
  },
  { _id: true }
);

const kidSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    age: { type: Number, required: true, min: 4 },
    avatarColor: { type: String, required: true },
    reading: {
      currentBooks: { type: [currentBookSchema], default: [] },
      sessions: { type: [readingSessionSchema], default: [] },
    },
    math: {
      games: { type: [mathGameSchema], default: [] },
    },
  },
  { timestamps: true }
);

kidSchema.index({ "reading.sessions.date": -1 });
kidSchema.index({ "math.games.playedAt": -1 });

const Kid = mongoose.models.Kid || mongoose.model("Kid", kidSchema);

export default Kid;
