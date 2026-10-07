import { vercelRequest } from './client.js';

export function listProjects({ limit = 20, search, teamId } = {}) {
  return vercelRequest('/v9/projects', { query: { limit, search, teamId } });
}

export function getProject(projectIdOrName, { teamId } = {}) {
  if (!projectIdOrName) throw new Error('Project ID or name is required.');
  return vercelRequest(`/v9/projects/${encodeURIComponent(projectIdOrName)}`, { query: { teamId } });
}
