import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET() {
  try {
    const sql = await getDatabase();
    const data = await sql`SELECT * FROM "Image";`;
    console.log(data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
