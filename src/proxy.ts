import { NextResponse, type NextRequest } from "next/server";

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function parseBasicAuth(value: string | null) {
  if (!value?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(value.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function adminCredentialsConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

function isAuthorizedAdmin(request: NextRequest) {
  const auth = parseBasicAuth(request.headers.get("authorization"));

  if (!auth) {
    return false;
  }

  return (
    auth.username === process.env.ADMIN_USERNAME &&
    auth.password === process.env.ADMIN_PASSWORD
  );
}

export function proxy(request: NextRequest) {
  if (!isAdminPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  if (!adminCredentialsConfigured()) {
    return new NextResponse("管理员入口未开放。", {
      status: 404,
    });
  }

  if (isAuthorizedAdmin(request)) {
    return NextResponse.next();
  }

  return new NextResponse("需要管理员权限。", {
    headers: {
      "WWW-Authenticate": 'Basic realm="ArchiveScope Admin"',
    },
    status: 401,
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
