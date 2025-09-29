import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Let API routes handle their own authentication
        // This prevents automatic redirects for API calls
        if (req.nextUrl.pathname.startsWith('/api/')) {
          return true;
        }

        // Protect dashboard and library pages
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
          return !!token;
        }
        if (req.nextUrl.pathname.startsWith('/library')) {
          return !!token;
        }

        // Allow other routes
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/library/:path*'],
};
