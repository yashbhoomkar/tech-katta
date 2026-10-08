import {
  getDeployment,
  getLatestProductionDeployment,
  getProject,
  inspectConfiguredProject,
  listDeployments,
  listProjects,
} from './client.js';

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage() {
  console.error(`Usage:
  node src/vercel/index.js projects [search]
  node src/vercel/index.js project <project-id-or-name>
  node src/vercel/index.js deployments [project-id]
  node src/vercel/index.js deployment <deployment-id-or-url>
  node src/vercel/index.js latest-production <project-id>
  node src/vercel/index.js inspect-configured-project

Required environment:
  VERCEL_ACCESS_TOKEN
  VERCEL_TEAM_ID

Optional:
  VERCEL_PROJECT_ID
`);
}

async function main() {
  const [, , command, argument] = process.argv;

  switch (command) {
    case 'projects':
      print(await listProjects({ search: argument }));
      return;

    case 'project':
      print(await getProject(argument));
      return;

    case 'deployments':
      print(await listDeployments({ projectId: argument || process.env.VERCEL_PROJECT_ID }));
      return;

    case 'deployment':
      print(await getDeployment(argument));
      return;

    case 'latest-production':
      print(await getLatestProductionDeployment(argument || process.env.VERCEL_PROJECT_ID));
      return;

    case 'inspect-configured-project':
      print(await inspectConfiguredProject());
      return;

    default:
      usage();
      process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`Vercel control failed: ${error.message}`);
  process.exitCode = 1;
});
