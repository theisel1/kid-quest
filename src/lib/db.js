import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!global.mongooseConnection) {
  global.mongooseConnection = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (global.mongooseConnection.conn) {
    return global.mongooseConnection.conn;
  }

  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI. Add it to .env.local before starting the app.");
  }

  if (!global.mongooseConnection.promise) {
    global.mongooseConnection.promise = mongoose.connect(MONGODB_URI, {
      dbName: "kid-quest",
      bufferCommands: false,
    });
  }

  global.mongooseConnection.conn = await global.mongooseConnection.promise;
  return global.mongooseConnection.conn;
}
