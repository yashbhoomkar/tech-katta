import { cancelDeployment, getDeployment, listDeployments } from './deployments.js';
import { getProject, listProjects } from './projects.js';

const usage = `
Tech Katta private Vercel control

Required environment:
  VERCEL_ACCESS_TOKEN
Optional:
  VERCEL_TEAM_ID

Commands:
  projects [limit]
  project <id-or-name>
  deployments [project-id] [limit]
  deployment <id-or-url>
  cancel <id-or-url>
`;

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const [, , command, ...args] = process.argv;
  switch (command) {
    case 'projects': print(await listProjects({ limit: args[0] || 20 })); break;
    case 'project': print(await getProject(args[0])); break;
    case 'deployments': print(await listDeployments({ projectId: args[0], limit: args[1] || 20 })); break;
    case 'deployment': print(await getDeployment(args[0])); break;
    case 'cancel': print(await cancelDeployment(args[0])); break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(usage);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error(`Vercel control failed: ${error.message}`);
  if (error.status) console.error(`HTTP status: ${error.status}`);
  process.exitCode = 1;
});
