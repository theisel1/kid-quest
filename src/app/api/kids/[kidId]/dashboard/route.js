import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { getDashboardStats } from "@/lib/kid-stats";

export async function GET(_request, { params }) {
  const { kidId } = await params;

  if (!Types.ObjectId.isValid(kidId)) {
    return Response.json({ error: "Invalid kid id." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const stats = await getDashboardStats(kidId);

    if (!stats) {
      return Response.json({ error: "Kid not found." }, { status: 404 });
    }

    return Response.json({ stats });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to load the dashboard." },
      { status: 500 }
    );
  }
}
