// A CDN answers a share CDN_HIT of the reads that may be served from the edge (the request's cdn_ok).
import { managed } from './managed.js';
import { CDN_HIT } from '../catalogue.js';
export default managed('cdn', 'edge', { cache: true, hitRatio: () => CDN_HIT });
