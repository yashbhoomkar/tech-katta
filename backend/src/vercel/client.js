import process from 'node:process';

const VERCEL_API_BASE = 'https://api.vercel.com';

function getConfig() {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('VERCEL_ACCESS_TOKEN is required.');

  return {
    token,
    teamId: process.env.VERCEL_TEAM_ID?.trim() || '',
  };
}

function buildUrl(path, query = {}, teamId = '') {
  const url = new URL(path, VERCEL_API_BASE);
  const params = { ...query };
  if (teamId && !params.teamId) params.teamId = teamId;

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

export async function vercelRequest(path, { method = 'GET', query = {}, body } = {}) {
  const { token, teamId } = getConfig();

  const response = await fetch(buildUrl(path, query, teamId), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const raw = await response.text();
  let payload;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw; }

  if (!response.ok) {
    const message = payload?.error?.message || `Vercel API request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
