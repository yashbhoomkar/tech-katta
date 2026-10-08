import { vercelRequest } from './client.js';

export function listProjects({ limit = 20, search } = {}) {
  return vercelRequest('/v9/projects', {
    params: { limit, search },
  });
}

export function getProject(idOrName) {
  if (!idOrName) throw new Error('Project id or name is required.');
  return vercelRequest(`/v9/projects/${encodeURIComponent(idOrName)}`);
}

export function listProjectDomains(projectIdOrName) {
  if (!projectIdOrName) throw new Error('Project id or name is required.');
  return vercelRequest(`/v9/projects/${encodeURIComponent(projectIdOrName)}/domains`);
}
