/**
 * Minimal Vercel REST API client for Tech Katta infrastructure tooling.
 *
 * Authentication is intentionally environment-only:
 *   VERCEL_ACCESS_TOKEN
 *   VERCEL_TEAM_ID (optional when the token's default scope is sufficient)
 *
 * Do not put Vercel credentials in source control, .env files committed to Git,
 * logs, or API responses.
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

function requiredToken() {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('VERCEL_ACCESS_TOKEN must be configured in the runtime environment.');
  }
  return token;
}

function buildUrl(path, query = {}) {
  const url = new URL(path, VERCEL_API_BASE);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function vercelRequest(path, { method = 'GET', query, body } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      Authorization: `Bearer ${requiredToken()}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Vercel API returned HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }

  return payload;
}

function scopedQuery(extra = {}) {
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  return teamId ? { teamId, ...extra } : extra;
}

export function getProject(projectIdOrName) {
  return vercelRequest(`/v9/projects/${encodeURIComponent(projectIdOrName)}`, {
    query: scopedQuery(),
  });
}

export function listProjects({ limit = 20, search } = {}) {
  return vercelRequest('/v9/projects', {
    query: scopedQuery({ limit, search }),
  });
}

export function getDeployment(idOrUrl) {
  return vercelRequest(`/v13/deployments/${encodeURIComponent(idOrUrl)}`, {
    query: scopedQuery(),
  });
}

export function listDeployments({ projectId, limit = 20, target } = {}) {
  return vercelRequest('/v6/deployments', {
    query: scopedQuery({ projectId, limit, target }),
  });
}

export function getDeploymentEvents(idOrUrl, { limit = 100 } = {}) {
  return vercelRequest(`/v3/deployments/${encodeURIComponent(idOrUrl)}/events`, {
    query: scopedQuery({ limit }),
  });
}

export function listProjectDomains(projectId) {
  return vercelRequest(`/v9/projects/${encodeURIComponent(projectId)}/domains`, {
    query: scopedQuery(),
  });
}

export const vercel = {
  getProject,
  listProjects,
  getDeployment,
  listDeployments,
  getDeploymentEvents,
  listProjectDomains,
};
