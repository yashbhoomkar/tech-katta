import { vercelRequest } from './client.js';

export function listDeployments({ projectId, limit = 20, target } = {}) {
  return vercelRequest('/v6/deployments', {
    params: { projectId, limit, target },
  });
}

export function getDeployment(idOrUrl) {
  if (!idOrUrl) throw new Error('Deployment id or URL is required.');
  return vercelRequest(`/v13/deployments/${encodeURIComponent(idOrUrl)}`, {
    params: { withGitRepoInfo: 'true' },
  });
}
