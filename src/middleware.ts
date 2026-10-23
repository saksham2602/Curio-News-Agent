import { NextResponse, type NextRequest } from "next/server";

// Gives every browser a stable guest id so reading history, bookmarks and notes
// persist before (and are merged after) sign-in.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("cb_guest")) {
    const id = `g_${crypto.randomUUID().replace(/-/g, "")}`;
    res.cookies.set("cb_guest", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/cron).*)"],
};
