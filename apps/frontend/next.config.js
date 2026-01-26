/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },

  /**
   * API Rewrites - Proxy /api/* requests to the FastAPI backend
   * 
   * This eliminates CORS issues because the browser sees all requests
   * as same-origin (localhost:3000).
   * 
   * How it works:
   *   Browser: GET /api/health
   *   ↓
   *   Next.js rewrites to: GET http://backend:8000/health (in Docker)
   *   ↓
   *   Browser receives response (no CORS headers needed)
   * 
   * Environment:
   *   - In Docker: BACKEND_URL=http://backend:8000 (container DNS)
   *   - Locally:   Falls back to http://localhost:8000
   */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    return [
      // Proxy all /api/* requests to backend (except Next.js API routes)
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      // Proxy /dev/* endpoints (like /dev/send-test-email)
      {
        source: '/dev/:path*',
        destination: `${backendUrl}/dev/:path*`,
      },
      // Proxy /health endpoints
      {
        source: '/health/:path*',
        destination: `${backendUrl}/health/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
