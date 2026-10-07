import { vercelRequest } from './client.js';

export function listDeployments({ projectId, target, state, limit = 20, teamId } = {}) {
  return vercelRequest('/v6/deployments', { query: { projectId, target, state, limit, teamId } });
}

export function getDeployment(deploymentIdOrUrl, { withGitRepoInfo = true, teamId } = {}) {
  if (!deploymentIdOrUrl) throw new Error('Deployment ID or URL is required.');
  return vercelRequest(`/v13/deployments/${encodeURIComponent(deploymentIdOrUrl)}`, {
    query: { withGitRepoInfo: String(withGitRepoInfo), teamId },
  });
}

export function cancelDeployment(deploymentIdOrUrl, { teamId } = {}) {
  if (!deploymentIdOrUrl) throw new Error('Deployment ID or URL is required.');
  return vercelRequest(`/v12/deployments/${encodeURIComponent(deploymentIdOrUrl)}/cancel`, {
    method: 'PATCH',
    query: { teamId },
  });
}
