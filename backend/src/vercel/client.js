/**
 * Internal Vercel REST API client.
 *
 * Authentication is intentionally environment-only:
 *   VERCEL_ACCESS_TOKEN
 *   VERCEL_TEAM_ID
 *
 * This module is not exposed through the public Express API.
 * Node 22's native fetch is used so no Vercel SDK dependency is required.
 */

const API_BASE_URL = 'https://api.vercel.com';
const DEFAULT_TIMEOUT_MS = 10_000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured to use Vercel control.`);
  }
  return value;
}

function buildUrl(path, query = {}) {
  const url = new URL(path, API_BASE_URL);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function vercelRequest(path, {
  method = 'GET',
  query = {},
  body,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const token = requiredEnv('VERCEL_ACCESS_TOKEN');
  const teamId = requiredEnv('VERCEL_TEAM_ID');

  const url = buildUrl(path, { teamId, ...query });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
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
      throw new Error(`Vercel API error (${response.status}): ${message}`);
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Vercel API request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function listProjects({ limit = 20, search } = {}) {
  return vercelRequest('/v9/projects', {
    query: { limit, search },
  });
}

export async function getProject(projectIdOrName) {
  if (!projectIdOrName) throw new Error('projectIdOrName is required.');
  return vercelRequest(`/v9/projects/${encodeURIComponent(projectIdOrName)}`);
}

export async function listDeployments({
  projectId,
  limit = 20,
  target,
  state,
  until,
  since,
} = {}) {
  return vercelRequest('/v6/deployments', {
    query: { projectId, limit, target, state, until, since },
  });
}

export async function getDeployment(deploymentIdOrUrl) {
  if (!deploymentIdOrUrl) throw new Error('deploymentIdOrUrl is required.');
  return vercelRequest(`/v13/deployments/${encodeURIComponent(deploymentIdOrUrl)}`);
}

export async function getLatestProductionDeployment(projectId) {
  if (!projectId) throw new Error('projectId is required.');
  const result = await listDeployments({
    projectId,
    limit: 1,
    target: 'production',
  });
  return result?.deployments?.[0] ?? null;
}

export async function inspectConfiguredProject() {
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error('VERCEL_PROJECT_ID must be configured for project inspection.');
  }

  const [project, deployments] = await Promise.all([
    getProject(projectId),
    listDeployments({ projectId, limit: 10 }),
  ]);

  return { project, deployments };
}
