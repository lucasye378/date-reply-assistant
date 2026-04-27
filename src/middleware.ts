import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const lang = request.headers.get("accept-language") || "";
  const isZh = lang.includes("zh");

  if (isZh && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/zh", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|zh|en).*)"],
};
