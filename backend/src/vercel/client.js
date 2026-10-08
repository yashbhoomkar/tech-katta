const VERCEL_API_BASE = 'https://api.vercel.com';

function getConfig() {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token) throw new Error('VERCEL_ACCESS_TOKEN is not configured.');

  return { token, teamId };
}

function buildUrl(path, params = {}) {
  const url = new URL(path, VERCEL_API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function vercelRequest(path, options = {}) {
  const { token, teamId } = getConfig();
  const url = buildUrl(path, {
    ...(options.params || {}),
    teamId: options.params?.teamId || teamId,
  });

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = text; }

  if (!response.ok) {
    const detail = data?.error?.message || (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error(`Vercel API ${response.status}: ${detail}`);
  }

  return data;
}

export function getVercelConfig() {
  const { token, teamId } = getConfig();
  return { authenticated: Boolean(token), teamId: teamId || null };
}

export function listProjects(params = {}) {
  return vercelRequest('/v9/projects', { params });
}

export function getProject(idOrName) {
  if (!idOrName) throw new Error('Project id or name is required.');
  return vercelRequest(`/v9/projects/${encodeURIComponent(idOrName)}`);
}

export function listDeployments(params = {}) {
  return vercelRequest('/v6/deployments', { params });
}

export function getDeployment(idOrUrl) {
  if (!idOrUrl) throw new Error('Deployment id or URL is required.');
  return vercelRequest(`/v13/deployments/${encodeURIComponent(idOrUrl)}`, {
    params: { withGitRepoInfo: 'true' },
  });
}

export function getDeploymentEvents(idOrUrl, params = {}) {
  if (!idOrUrl) throw new Error('Deployment id or URL is required.');
  return vercelRequest(`/v3/deployments/${encodeURIComponent(idOrUrl)}/events`, { params });
}

export function listProjectDomains(projectIdOrName) {
  if (!projectIdOrName) throw new Error('Project id or name is required.');
  return vercelRequest(`/v9/projects/${encodeURIComponent(projectIdOrName)}/domains`);
}
