import process from 'node:process';

const VERCEL_API_BASE = 'https://api.vercel.com';

function getConfig() {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('VERCEL_ACCESS_TOKEN is required.');
  }

  return {
    token,
    teamId: process.env.VERCEL_TEAM_ID?.trim() || '',
  };
}

function withTeamId(path, teamId) {
  if (!teamId) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}teamId=${encodeURIComponent(teamId)}`;
}

export async function vercelRequest(path, { method = 'GET', body } = {}) {
  const { token, teamId } = getConfig();
  const url = new URL(withTeamId(path, teamId), VERCEL_API_BASE);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const detail = typeof payload === 'string' ? payload : JSON.stringify(payload);
    throw new Error(`Vercel API ${response.status}: ${detail}`);
  }

  return payload;
}
