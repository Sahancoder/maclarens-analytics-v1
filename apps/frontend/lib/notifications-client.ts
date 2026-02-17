export interface BackendNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  items: BackendNotification[];
  total: number;
  unread_count: number;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("mclarens_token");
}

async function notificationsFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`/api/notifications${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
}

export async function fetchNotifications(limit = 100): Promise<BackendNotification[]> {
  const response = await notificationsFetch(`?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to load notifications (${response.status})`);
  }

  const payload: NotificationsResponse = await response.json();
  return payload.items ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await notificationsFetch(`/${id}/read`, { method: "PATCH" });
  if (!response.ok) {
    throw new Error(`Failed to mark notification as read (${response.status})`);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await notificationsFetch("/read-all", { method: "PATCH" });
  if (!response.ok) {
    throw new Error(`Failed to mark all notifications as read (${response.status})`);
  }
}

export async function deleteNotificationById(id: string): Promise<void> {
  const response = await notificationsFetch(`/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete notification (${response.status})`);
  }
}

export function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} minute(s) ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} hour(s) ago`;
  return `${Math.max(1, Math.floor(diffMs / day))} day(s) ago`;
}

export function formatDateYYYYMMDD(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function extractCompanyAndPeriod(text: string): { company: string; period: string } {
  const match = text.match(/for\s+(.+?)\s+\(([^)]+)\)/i);
  if (!match) {
    return { company: "N/A", period: "N/A" };
  }

  return {
    company: match[1].trim(),
    period: match[2].trim(),
  };
}

export function extractActor(text: string): string {
  const byMatch = text.match(/\bby\s+([^.,]+)$/i);
  if (!byMatch) {
    return "System";
  }
  return byMatch[1].trim();
}
