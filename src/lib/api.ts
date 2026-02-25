import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export function jsonError(message: string | Record<string, unknown>, status: number) {
  const body = typeof message === "string" ? { error: message } : message;
  return NextResponse.json(body, { status });
}

export function jsonSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
