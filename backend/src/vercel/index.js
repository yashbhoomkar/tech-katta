import { getDeployment, listDeployments } from './deployments.js';
import { getProject, listProjects, listProjectDomains } from './projects.js';

function usage() {
  console.log(`Tech Katta Vercel control

Commands:
  node src/vercel/index.js project <projectIdOrName>
  node src/vercel/index.js projects [limit]
  node src/vercel/index.js deployments [projectId] [limit]
  node src/vercel/index.js inspect <deploymentIdOrUrl>
  node src/vercel/index.js domains <projectIdOrName>

Environment:
  VERCEL_ACCESS_TOKEN  required
  VERCEL_TEAM_ID       optional
`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  let result;

  switch (command) {
    case 'project':
      result = await getProject(args[0]);
      break;
    case 'projects':
      result = await listProjects({ limit: Number(args[0]) || 20 });
      break;
    case 'deployments':
      result = await listDeployments({
        projectId: args[0],
        limit: Number(args[1]) || 20,
      });
      break;
    case 'inspect':
      result = await getDeployment(args[0]);
      break;
    case 'domains':
      result = await listProjectDomains(args[0]);
      break;
    default:
      usage();
      process.exitCode = command ? 1 : 0;
      return;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`Vercel control failed: ${error.message}`);
  process.exitCode = 1;
});
