import {
  cancelDeployment,
  getDeployment,
  getDeploymentEvents,
  getProject,
  listDeployments,
  listProjectDomains,
  listProjects,
} from '../src/vercelClient.js';

const [command, ...args] = process.argv.slice(2);

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.error(`Usage:
  npm run vercel:control -- project <project-id-or-name>
  npm run vercel:control -- projects
  npm run vercel:control -- deployment <deployment-id>
  npm run vercel:control -- deployments <project-id>
  npm run vercel:control -- events <deployment-id>
  npm run vercel:control -- cancel <deployment-id>
  npm run vercel:control -- domains <project-id>

Required environment:
  VERCEL_ACCESS_TOKEN
Optional:
  VERCEL_TEAM_ID
`);
  process.exitCode = 2;
}

if (!command) {
  usage();
} else {
  try {
    switch (command) {
      case 'project':
        if (!args[0]) { usage(); break; }
        print(await getProject(args[0]));
        break;
      case 'projects':
        print(await listProjects());
        break;
      case 'deployment':
        if (!args[0]) { usage(); break; }
        print(await getDeployment(args[0]));
        break;
      case 'deployments':
        if (!args[0]) { usage(); break; }
        print(await listDeployments({ projectId: args[0] }));
        break;
      case 'events':
        if (!args[0]) { usage(); break; }
        print(await getDeploymentEvents(args[0]));
        break;
      case 'cancel':
        if (!args[0]) { usage(); break; }
        print(await cancelDeployment(args[0]));
        break;
      case 'domains':
        if (!args[0]) { usage(); break; }
        print(await listProjectDomains(args[0]));
        break;
      default:
        usage();
    }
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      status: error.status ?? null,
      code: error.code ?? null,
    }, null, 2));
    process.exitCode = 1;
  }
}
