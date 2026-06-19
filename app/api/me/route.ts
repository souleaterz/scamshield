import { NextResponse } from "next/server";
import { getUserId } from "@/app/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ signedIn: userId !== null });
}
