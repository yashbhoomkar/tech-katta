import process from 'node:process';

const API_BASE = 'https://api.vercel.com';
const DEFAULT_TEAM_ID = 'team_ESVBoCGScxPRCW4TxwcTeJCg';

function getConfig() {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || DEFAULT_TEAM_ID;

  if (!token) {
    throw new Error('VERCEL_ACCESS_TOKEN is required.');
  }

  return { token, teamId };
}

function buildUrl(path, params = {}) {
  const url = new URL(path, API_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

async function request(path, { method = 'GET', params, body } = {}) {
  const { token, teamId } = getConfig();
  const url = buildUrl(path, { ...params, teamId });

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
    const detail = typeof payload === 'object' && payload
      ? payload.error?.message || payload.message || JSON.stringify(payload)
      : String(payload);

    throw new Error(`Vercel API ${response.status}: ${detail}`);
  }

  return payload;
}

export async function listProjects({ limit = 20, from } = {}) {
  return request('/v9/projects', {
    params: { limit, from },
  });
}

export async function getProject(projectIdOrName) {
  if (!projectIdOrName) throw new Error('projectIdOrName is required.');
  return request(`/v9/projects/${encodeURIComponent(projectIdOrName)}`);
}

export async function listDeployments({ projectId, limit = 20, from } = {}) {
  return request('/v6/deployments', {
    params: { projectId, limit, from },
  });
}

export async function getDeployment(deploymentIdOrUrl) {
  if (!deploymentIdOrUrl) throw new Error('deploymentIdOrUrl is required.');
  return request(`/v13/deployments/${encodeURIComponent(deploymentIdOrUrl)}`);
}

export async function cancelDeployment(deploymentId) {
  if (!deploymentId) throw new Error('deploymentId is required.');
  return request(`/v12/deployments/${encodeURIComponent(deploymentId)}/cancel`, {
    method: 'PATCH',
  });
}

export async function checkAccess() {
  const projects = await listProjects({ limit: 1 });
  return {
    ok: true,
    teamId: getConfig().teamId,
    projectCountReturned: projects?.projects?.length ?? 0,
    projects,
  };
}

function usage() {
  console.log(`Tech Katta Vercel control

Commands:
  projects
  project <project-id-or-name>
  deployments [project-id-or-name]
  deployment <deployment-id-or-url>
  cancel <deployment-id>
  check

Environment:
  VERCEL_ACCESS_TOKEN  Required. Never commit this value.
  VERCEL_TEAM_ID       Optional. Defaults to the Tech Katta Vercel team.
`);
}

async function main() {
  const [command, argument] = process.argv.slice(2);

  if (!command || command === 'help') {
    usage();
    return;
  }

  let result;

  switch (command) {
    case 'projects':
      result = await listProjects();
      break;
    case 'project':
      result = await getProject(argument);
      break;
    case 'deployments':
      result = await listDeployments({ projectId: argument });
      break;
    case 'deployment':
      result = await getDeployment(argument);
      break;
    case 'cancel':
      result = await cancelDeployment(argument);
      break;
    case 'check':
      result = await checkAccess();
      break;
    default:
      usage();
      process.exitCode = 2;
      return;
  }

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
