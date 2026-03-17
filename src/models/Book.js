import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: { type: String, required: true },
    level: { type: String, required: true },
    totalPages: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

bookSchema.index({ title: 1, author: 1 });

const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);

export default Book;
