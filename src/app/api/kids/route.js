import { connectToDatabase } from "@/lib/db";
import Kid from "@/models/Kid";

export async function GET() {
  try {
    await connectToDatabase();

    const kids = await Kid.find({})
      .sort({ name: 1 })
      .select("name age avatarColor slug reading.currentBooks")
      .lean();

    return Response.json({
      kids: kids.map((kid) => ({
        id: kid._id.toString(),
        name: kid.name,
        age: kid.age,
        slug: kid.slug,
        avatarColor: kid.avatarColor,
        currentBookCount: kid.reading?.currentBooks?.length ?? 0,
      })),
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to load kids." },
      { status: 500 }
    );
  }
}
