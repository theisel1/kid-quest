import { connectToDatabase } from "../src/lib/db.js";
import { buildBookDocument } from "../src/lib/books.js";
import Book from "../src/models/Book.js";
import Kid from "../src/models/Kid.js";

const seedBooks = [
  buildBookDocument({
    title: "Charlotte's Web",
    author: "E. B. White",
    level: "Level M",
    totalPages: 192,
  }),
  buildBookDocument({
    title: "The Wild Robot",
    author: "Peter Brown",
    level: "Level N",
    totalPages: 320,
  }),
  buildBookDocument({
    title: "Magic Tree House: Dinosaurs Before Dark",
    author: "Mary Pope Osborne",
    level: "Level K",
    totalPages: 96,
  }),
  buildBookDocument({
    title: "I Survived the Great Chicago Fire",
    author: "Lauren Tarshis",
    level: "Level O",
    totalPages: 112,
  }),
];

function buildReadingSession(book, date, minutes, pagesRead) {
  return {
    bookId: book._id,
    bookTitle: book.title,
    date,
    minutes,
    pagesRead,
  };
}

async function seed() {
  await connectToDatabase();
  await Book.deleteMany({});
  await Kid.deleteMany({});

  const books = await Book.insertMany(seedBooks);
  const bookMap = new Map(books.map((book) => [book.slug, book]));

  const sampleKids = [
    {
      name: "Ava",
      slug: "ava",
      age: 8,
      avatarColor: "#f97316",
      reading: {
        currentBooks: [
          {
            bookId: bookMap.get("charlotte-s-web-e-b-white")._id,
            currentPage: 74,
          },
          {
            bookId: bookMap.get("the-wild-robot-peter-brown")._id,
            currentPage: 112,
          },
        ],
        sessions: [
          buildReadingSession(bookMap.get("charlotte-s-web-e-b-white"), "2026-03-12", 20, 12),
          buildReadingSession(bookMap.get("the-wild-robot-peter-brown"), "2026-03-13", 25, 15),
          buildReadingSession(bookMap.get("charlotte-s-web-e-b-white"), "2026-03-14", 18, 10),
          buildReadingSession(bookMap.get("the-wild-robot-peter-brown"), "2026-03-15", 22, 14),
        ],
      },
      math: {
        games: [
          {
            playedAt: "2026-03-13T16:00:00.000Z",
            score: 8,
            attempts: 12,
            questions: [
              { prompt: "7 + 5", topic: "addition", answer: 12, userAnswer: 12, correct: true, attempts: 1 },
              { prompt: "14 - 6", topic: "subtraction", answer: 8, userAnswer: 8, correct: true, attempts: 1 },
              { prompt: "3 x 4", topic: "multiplication", answer: 12, userAnswer: 12, correct: true, attempts: 1 },
              { prompt: "9 + 8", topic: "addition", answer: 17, userAnswer: 17, correct: true, attempts: 1 },
              { prompt: "12 - 5", topic: "subtraction", answer: 7, userAnswer: 9, correct: false, attempts: 2 },
              { prompt: "6 x 2", topic: "multiplication", answer: 12, userAnswer: 12, correct: true, attempts: 1 },
              { prompt: "10 + 6", topic: "addition", answer: 16, userAnswer: 16, correct: true, attempts: 1 },
              { prompt: "15 - 7", topic: "subtraction", answer: 8, userAnswer: 8, correct: true, attempts: 1 },
              { prompt: "5 x 5", topic: "multiplication", answer: 25, userAnswer: 20, correct: false, attempts: 2 },
              { prompt: "11 + 4", topic: "addition", answer: 15, userAnswer: 15, correct: true, attempts: 1 },
            ],
          },
          {
            playedAt: "2026-03-15T17:30:00.000Z",
            score: 9,
            attempts: 11,
            questions: [
              { prompt: "8 + 7", topic: "addition", answer: 15, userAnswer: 15, correct: true, attempts: 1 },
              { prompt: "16 - 9", topic: "subtraction", answer: 7, userAnswer: 7, correct: true, attempts: 1 },
              { prompt: "4 x 3", topic: "multiplication", answer: 12, userAnswer: 12, correct: true, attempts: 1 },
              { prompt: "13 + 5", topic: "addition", answer: 18, userAnswer: 18, correct: true, attempts: 1 },
              { prompt: "11 - 4", topic: "subtraction", answer: 7, userAnswer: 7, correct: true, attempts: 1 },
              { prompt: "7 x 2", topic: "multiplication", answer: 14, userAnswer: 14, correct: true, attempts: 1 },
              { prompt: "6 + 9", topic: "addition", answer: 15, userAnswer: 15, correct: true, attempts: 1 },
              { prompt: "18 - 8", topic: "subtraction", answer: 10, userAnswer: 10, correct: true, attempts: 1 },
              { prompt: "3 x 6", topic: "multiplication", answer: 18, userAnswer: 18, correct: true, attempts: 1 },
              { prompt: "9 + 9", topic: "addition", answer: 18, userAnswer: 16, correct: false, attempts: 2 },
            ],
          },
        ],
      },
    },
    {
      name: "Leo",
      slug: "leo",
      age: 10,
      avatarColor: "#0f766e",
      reading: {
        currentBooks: [
          {
            bookId: bookMap.get("magic-tree-house-dinosaurs-before-dark-mary-pope-osborne")._id,
            currentPage: 61,
          },
          {
            bookId: bookMap.get("i-survived-the-great-chicago-fire-lauren-tarshis")._id,
            currentPage: 48,
          },
        ],
        sessions: [
          buildReadingSession(
            bookMap.get("magic-tree-house-dinosaurs-before-dark-mary-pope-osborne"),
            "2026-03-11",
            16,
            8
          ),
          buildReadingSession(
            bookMap.get("i-survived-the-great-chicago-fire-lauren-tarshis"),
            "2026-03-13",
            21,
            11
          ),
          buildReadingSession(
            bookMap.get("magic-tree-house-dinosaurs-before-dark-mary-pope-osborne"),
            "2026-03-14",
            17,
            9
          ),
        ],
      },
      math: {
        games: [
          {
            playedAt: "2026-03-12T18:15:00.000Z",
            score: 7,
            attempts: 13,
            questions: [
              { prompt: "5 + 6", topic: "addition", answer: 11, userAnswer: 11, correct: true, attempts: 1 },
              { prompt: "13 - 7", topic: "subtraction", answer: 6, userAnswer: 4, correct: false, attempts: 2 },
              { prompt: "2 x 8", topic: "multiplication", answer: 16, userAnswer: 16, correct: true, attempts: 1 },
              { prompt: "9 + 3", topic: "addition", answer: 12, userAnswer: 12, correct: true, attempts: 1 },
              { prompt: "15 - 6", topic: "subtraction", answer: 9, userAnswer: 9, correct: true, attempts: 1 },
              { prompt: "4 x 5", topic: "multiplication", answer: 20, userAnswer: 20, correct: true, attempts: 1 },
              { prompt: "8 + 8", topic: "addition", answer: 16, userAnswer: 14, correct: false, attempts: 2 },
              { prompt: "12 - 3", topic: "subtraction", answer: 9, userAnswer: 9, correct: true, attempts: 1 },
              { prompt: "7 x 3", topic: "multiplication", answer: 21, userAnswer: 21, correct: true, attempts: 1 },
              { prompt: "10 + 5", topic: "addition", answer: 15, userAnswer: 12, correct: false, attempts: 2 },
            ],
          },
        ],
      },
    },
  ];

  await Kid.insertMany(sampleKids);

  console.log("Seeded 2 kid profiles for Kid Quest.");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed Kid Quest:", error);
    process.exit(1);
  });
