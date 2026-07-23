import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  if (
    process.env.VERCEL_ENV === "production" &&
    hostname.endsWith(".vercel.app") &&
    hostname !== "clearfc.vercel.app"
  ) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https:";
    canonicalUrl.hostname = "clearfc.vercel.app";
    canonicalUrl.port = "";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
