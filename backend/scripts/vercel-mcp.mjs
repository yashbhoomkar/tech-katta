import readline from 'node:readline';
import {
  getDeployment,
  getDeploymentEvents,
  getProject,
  listDeployments,
  listProjectDomains,
  listProjects,
} from '../src/vercelClient.js';

const tools = [
  {
    name: 'vercel_list_projects',
    description: 'List Vercel projects visible to the configured token and optional team scope.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        search: { type: 'string' },
      },
    },
  },
  {
    name: 'vercel_get_project',
    description: 'Get a Vercel project by ID or name.',
    inputSchema: {
      type: 'object',
      properties: { projectIdOrName: { type: 'string' } },
      required: ['projectIdOrName'],
    },
  },
  {
    name: 'vercel_list_deployments',
    description: 'List Vercel deployments, optionally scoped to a project and target.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        target: { type: 'string', enum: ['production', 'preview'] },
      },
    },
  },
  {
    name: 'vercel_get_deployment',
    description: 'Get a Vercel deployment by deployment ID or URL.',
    inputSchema: {
      type: 'object',
      properties: { idOrUrl: { type: 'string' } },
      required: ['idOrUrl'],
    },
  },
  {
    name: 'vercel_get_deployment_events',
    description: 'Get events/log-style records for a Vercel deployment.',
    inputSchema: {
      type: 'object',
      properties: {
        idOrUrl: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 1000 },
      },
      required: ['idOrUrl'],
    },
  },
  {
    name: 'vercel_list_project_domains',
    description: 'List domains configured for a Vercel project.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
];

function toolResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(error) {
  return {
    isError: true,
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: error.message,
        status: error.status ?? null,
        code: error.code ?? null,
      }, null, 2),
    }],
  };
}

async function callTool(name, args = {}) {
  switch (name) {
    case 'vercel_list_projects':
      return listProjects(args);
    case 'vercel_get_project':
      return getProject(args.projectIdOrName);
    case 'vercel_list_deployments':
      return listDeployments(args);
    case 'vercel_get_deployment':
      return getDeployment(args.idOrUrl);
    case 'vercel_get_deployment_events':
      return getDeploymentEvents(args.idOrUrl, { limit: args.limit });
    case 'vercel_list_project_domains':
      return listProjectDomains(args.projectId);
    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { code: 'UNKNOWN_TOOL' });
  }
}

async function handle(message) {
  if (message.method === 'notifications/initialized') return null;

  if (message.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'tech-katta-vercel', version: '1.0.0' },
      },
    };
  }

  if (message.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { tools },
    };
  }

  if (message.method === 'tools/call') {
    try {
      const value = await callTool(message.params?.name, message.params?.arguments ?? {});
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: toolResult(value),
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: toolError(error),
      };
    }
  }

  if (message.id !== undefined) {
    return {
      jsonrpc: '2.0',
      id: message.id,
      error: { code: -32601, message: `Method not found: ${message.method}` },
    };
  }

  return null;
}

const input = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

for await (const line of input) {
  if (!line.trim()) continue;

  try {
    const message = JSON.parse(line);
    const response = await handle(message);
    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: error.message },
    })}\n`);
  }
}
