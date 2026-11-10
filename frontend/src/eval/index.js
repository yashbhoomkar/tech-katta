// The v2 evaluator (tech-katta-context/evaluator.md). A problem uses it when its `practice.v` is 2; every other
// problem keeps the v1 judge (judge/judge.js). Built in phases (evaluator.md §15).
export { evalCatalogue, settingsOf, configOf, allowedEdge, capsOf, cleanDesign2 } from './design.js';
export { buildGraph } from './graph.js';
export { accessPath, fieldMatcher, holds } from './access.js';
export { compile } from './compile.js';
export { runTrace, expected } from './trace.js';

export { simulateTest } from './simulate.js';
export { analyse } from './analyse.js';
export { evaluate, designPoints, AREAS } from './judge.js';
