// One object per part kind, all with the same functions (spec section 21.3). Adding a kind = a file here, its numbers in
// catalogue.js, its row in the Builder's Add sheet and its route rules in compile.js.
import lb from './lb.js';
import cdn from './cdn.js';
import server from './server.js';
import worker from './worker.js';
import cache from './cache.js';
import sql from './sql.js';
import nosql from './nosql.js';
import queue from './queue.js';
import objectstore from './objectstore.js';
import idgen from './idgen.js';
export const KINDS = { lb, cdn, server, worker, cache, sql, nosql, queue, objectstore, idgen };
