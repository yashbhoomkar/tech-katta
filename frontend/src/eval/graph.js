// The design as a graph (evaluator.md §7.2). Works on a cleaned design (design.js cleanDesign2).
//
// A database's outgoing arrows carry its changes (change data capture) and are not part of the request flow:
// they are kept apart (cdcEdges) and left out of the topological order, so a worker fed by a database's changes
// may write back into that database without making a loop.
import { capsOf } from './design.js';

export const ERRORS = {
  E_NO_CLIENTS: () => 'Add the Clients: tests send their traffic from there.',
  E_CLIENTS_ALONE: () => 'Connect the Clients to the component they call first.',
  E_LOOP: () => 'Remove the loop: arrows must not lead back to a component they came from.',
  E_CDC: (name, engine) => `${name} can't emit its changes: ${engine} has no change stream.`,
};

// → { byId, out, inn, flowEdges, cdcEdges, topo, errors: [{code, message, node?}] }
// out / inn: node id → node ids, in edge order. topo: node ids, Kahn's algorithm, ties broken by node order.
export function buildGraph(design, lab = null) {
  const nodes = design?.nodes || [], edges = design?.edges || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const out = new Map(nodes.map((n) => [n.id, []])), inn = new Map(nodes.map((n) => [n.id, []]));
  const flowEdges = [], cdcEdges = [];
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue;
    out.get(e.from).push(e.to); inn.get(e.to).push(e.from);
    // a database's arrows carry its changes; an external service's arrows start webhooks (their calls begin there):
    // neither is part of the request flow's order, so a call out and a webhook back are not a loop
    if (byId.get(e.from).type === 'database') cdcEdges.push(e); else if (byId.get(e.from).type !== 'external') flowEdges.push(e);
  }
  // Kahn's algorithm over the flow edges; the ready list is kept in node order, so the result is stable
  const deg = new Map(nodes.map((n) => [n.id, 0]));
  const flowOut = new Map(nodes.map((n) => [n.id, []]));
  for (const e of flowEdges) { deg.set(e.to, deg.get(e.to) + 1); flowOut.get(e.from).push(e.to); }
  const ready = nodes.filter((n) => deg.get(n.id) === 0).map((n) => n.id), topo = [];
  while (ready.length) {
    ready.sort((a, b) => index.get(a) - index.get(b));
    const id = ready.shift(); topo.push(id);
    for (const to of flowOut.get(id)) { deg.set(to, deg.get(to) - 1); if (deg.get(to) === 0) ready.push(to); }
  }
  const errors = [];
  const clients = nodes.filter((n) => n.type === 'client');
  if (!clients.length) errors.push({ code: 'E_NO_CLIENTS', message: ERRORS.E_NO_CLIENTS() });
  for (const c of clients) if (!out.get(c.id).length) { errors.push({ code: 'E_CLIENTS_ALONE', message: ERRORS.E_CLIENTS_ALONE(), node: c.id }); break; }
  if (topo.length < nodes.length) errors.push({ code: 'E_LOOP', message: ERRORS.E_LOOP() });
  if (lab) for (const e of cdcEdges) {
    const db = byId.get(e.from);
    if (!capsOf(db, lab).includes('cdc')) { const eng = (lab.components || []).find((c) => c.type === 'database')?.engines?.find((x) => x.id === db.config?.engine); errors.push({ code: 'E_CDC', message: ERRORS.E_CDC(db.name || 'The database', eng?.label || 'its engine'), node: db.id }); }
  }
  return { byId, out, inn, flowEdges, cdcEdges, topo, errors };
}
