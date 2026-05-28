import { API_BASE_URL, AUTH_STORAGE_KEY, fetchWithTimeout } from '@/lib/api-client';

export const isSupabaseConfigured = Boolean(API_BASE_URL);

export type SpiralSession = {
  token: string;
  refresh_token?: string;
  user: { id: string; email?: string };
};

export type Goal = {
  id: string;
  user_id: string;
  goal_text: string;
  category: string;
  start_date: string;
  status: 'active' | 'archived';
  created_at?: string;
};

export type Milestone = {
  id: string;
  goal_id: string;
  type: 'monthly' | 'weekly';
  month_number: number | null;
  week_number: number | null;
  milestone_text: string;
  created_at?: string;
};

export type CheckIn = {
  id: string;
  goal_id: string;
  week_number: number;
  log_text: string;
  effort_score: number;
  created_at?: string;
};

const SESSION_KEY = 'spiral.neon.session';
const LEGACY_SESSION_KEY = 'spiral.supabase.session';

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Backend API is not configured yet. Add NEXT_PUBLIC_API_URL.');
  }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  assertConfigured();
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'The Neon backend got weird. Try again.');
  }

  return data;
}

function decodeJwtPayload(token: string): { exp?: number; sub?: string; email?: string } | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isJwtExpired(token: string) {
  const payload = decodeJwtPayload(token);
  return Boolean(payload?.exp && payload.exp * 1000 <= Date.now());
}

function normalizeSession(data: any): SpiralSession {
  const accessToken = data?.access_token || data?.token;
  const jwtPayload = accessToken ? decodeJwtPayload(accessToken) : null;

  return {
    token: accessToken || '',
    refresh_token: data?.refresh_token,
    user: data?.user || { id: jwtPayload?.sub || '', email: jwtPayload?.email },
  };
}

export function saveSession(session: SpiralSession) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  }
}

export function getStoredSession(): SpiralSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as SpiralSession;
    if (!session.token || isJwtExpired(session.token)) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  }
}

export async function signUpWithEmail(email: string, password: string) {
  const session = normalizeSession(await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }));

  if (session.token && session.user) saveSession(session);
  return session;
}

export async function signInWithEmail(email: string, password: string) {
  const session = normalizeSession(await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }));

  saveSession(session);
  return session;
}

export async function signOut() {
  clearSession();
}

function authHeaders(session: SpiralSession) {
  return {
    Authorization: `Bearer ${session.token}`,
  };
}

export async function getActiveGoal(session: SpiralSession): Promise<Goal | null> {
  return apiFetch('/api/goals/active', {
    headers: authHeaders(session),
  });
}

export async function getArchivedGoals(session: SpiralSession): Promise<Goal[]> {
  return apiFetch('/api/goals/archived', {
    headers: authHeaders(session),
  });
}

export async function archiveGoal(session: SpiralSession, goalId: string): Promise<Goal> {
  return apiFetch(`/api/goals/${goalId}/archive`, {
    method: 'PATCH',
    headers: authHeaders(session),
  });
}

export async function createGoal(session: SpiralSession, input: { goal_text: string; category: string; start_date: string }): Promise<Goal> {
  return apiFetch('/api/goals', {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify(input),
  });
}

export async function updateGoal(session: SpiralSession, goalId: string, input: { goal_text?: string }): Promise<Goal> {
  return apiFetch(`/api/goals/${goalId}`, {
    method: 'PATCH',
    headers: authHeaders(session),
    body: JSON.stringify(input),
  });
}

export async function createMilestones(session: SpiralSession, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return [];
  return apiFetch('/api/milestones', {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify(rows),
  });
}

export async function getMilestones(session: SpiralSession, goalId: string): Promise<Milestone[]> {
  return apiFetch(`/api/goals/${goalId}/milestones`, {
    headers: authHeaders(session),
  });
}

export async function getCheckIns(session: SpiralSession, goalId: string): Promise<CheckIn[]> {
  return apiFetch(`/api/goals/${goalId}/checkins`, {
    headers: authHeaders(session),
  });
}

function calculateCurrentWeekNumber(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;

  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksPassed = Math.floor((Date.now() - start.getTime()) / millisecondsPerWeek);
  return Math.max(1, weeksPassed + 1);
}

export async function createCheckIn(
  session: SpiralSession,
  input: { log_text: string; effort_score: number; goal_id?: string; week_number?: number },
): Promise<CheckIn> {
  const activeGoal = input.goal_id && input.week_number ? null : await getActiveGoal(session);
  const goalId = input.goal_id || activeGoal?.id;
  const weekNumber = input.week_number || (activeGoal ? calculateCurrentWeekNumber(activeGoal.start_date) : undefined);

  if (!goalId || !weekNumber) {
    throw new Error('No active goal found for this check-in. Create or reactivate a goal first.');
  }

  return apiFetch('/api/checkins', {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({
      goal_id: goalId,
      week_number: weekNumber,
      log_text: input.log_text,
      effort_score: input.effort_score,
    }),
  });
}
