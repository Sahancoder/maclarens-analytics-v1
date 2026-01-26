/**
 * ============================================
 * API Client for Backend Communication
 * ============================================
 * 
 * Uses Next.js rewrites so all calls go to /api/* and are proxied
 * to the FastAPI backend service. No CORS issues!
 * 
 * In Docker:
 *   Browser → localhost:3000/api/health
 *   Next.js → http://backend:8000/health
 * 
 * Locally (without Docker):
 *   Browser → localhost:3000/api/health  
 *   Next.js → http://localhost:8000/health
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
}

export interface FullHealthResponse {
  status: string;
  timestamp: string;
  components: {
    database: ComponentHealth;
    redis: ComponentHealth;
    email: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: string;
  latency_ms?: number;
  error?: string;
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResponse {
  status: 'sent' | 'error';
  to?: string;
  subject?: string;
  from?: string;
  smtp_host?: string;
  smtp_port?: number;
  message?: string;
  error?: string;
}

export interface ApiError {
  error: string;
  status: number;
}

// ─────────────────────────────────────────────────────────────
// Base Fetch Wrapper
// ─────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// Health Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * Quick health check - confirms API is running
 * 
 * @example
 * const health = await checkHealth();
 * console.log(health.status); // "healthy"
 */
export async function checkHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/api/health');
}

/**
 * Full system health check - DB, Redis, Email
 * 
 * @example
 * const health = await checkFullHealth();
 * console.log(health.components.database.status); // "healthy"
 */
export async function checkFullHealth(): Promise<FullHealthResponse> {
  return apiFetch<FullHealthResponse>('/api/health/full');
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<ComponentHealth> {
  return apiFetch<ComponentHealth>('/api/health/db');
}

/**
 * Redis health check
 */
export async function checkRedisHealth(): Promise<ComponentHealth> {
  return apiFetch<ComponentHealth>('/api/health/redis');
}

/**
 * Email provider health check
 */
export async function checkEmailHealth(): Promise<ComponentHealth> {
  return apiFetch<ComponentHealth>('/api/health/email');
}

// ─────────────────────────────────────────────────────────────
// Dev/Test Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * Send a test email (for Mailpit verification in local dev)
 * 
 * @example
 * const result = await sendTestEmail({
 *   to: "test@example.com",
 *   subject: "Hello from McLarens",
 *   body: "This is a test email!"
 * });
 * console.log(result.status); // "sent"
 * // Now check Mailpit UI at http://localhost:8025
 */
export async function sendTestEmail(
  request: SendEmailRequest
): Promise<SendEmailResponse> {
  return apiFetch<SendEmailResponse>('/dev/send-test-email', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ─────────────────────────────────────────────────────────────
// Export Endpoints
// ─────────────────────────────────────────────────────────────

export interface AvailablePeriod {
  year: number;
  month: number;
}

export interface AvailablePeriodsResponse {
  periods: AvailablePeriod[];
}

/**
 * Get available periods for financial export
 */
export async function getAvailablePeriods(): Promise<AvailablePeriodsResponse> {
  return apiFetch<AvailablePeriodsResponse>('/api/export/available-periods');
}

/**
 * Download financial summary Excel file
 * Returns a Blob that can be downloaded
 */
export async function downloadFinancialSummary(
  year: number,
  month: number
): Promise<Blob> {
  const response = await fetch(
    `/api/export/financial-summary?year=${year}&month=${month}`
  );
  
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  
  return response.blob();
}

// ─────────────────────────────────────────────────────────────
// Usage Examples (for reference)
// ─────────────────────────────────────────────────────────────

/*
// In a React component or page:

import { checkHealth, sendTestEmail, checkFullHealth } from '@/lib/api';

// Example 1: Health check on component mount
useEffect(() => {
  async function checkApi() {
    try {
      const health = await checkHealth();
      console.log('API Status:', health.status);
    } catch (error) {
      console.error('API unavailable:', error);
    }
  }
  checkApi();
}, []);

// Example 2: Send test email (button click handler)
async function handleSendTestEmail() {
  try {
    const result = await sendTestEmail({
      to: "developer@example.com",
      subject: "Test from McLarens Analytics",
      body: "If you see this in Mailpit, the email system works!"
    });
    
    if (result.status === 'sent') {
      alert('Email sent! Check Mailpit at http://localhost:8025');
    } else {
      alert('Email failed: ' + result.error);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

// Example 3: Full system health dashboard
async function getSystemStatus() {
  const health = await checkFullHealth();
  
  return {
    database: health.components.database.status === 'healthy',
    redis: health.components.redis.status === 'healthy',
    email: health.components.email.status === 'healthy',
    overall: health.status === 'healthy'
  };
}
*/
