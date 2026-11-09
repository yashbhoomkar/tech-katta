// Figure ids the frontend can draw, one list per sub-tab: backend/src/content/figs/<tab>/<sub-tab>.js mirrors
// frontend/src/figs/<tab>/<sub-tab>.jsx, and a test checks that each pair has the same ids.
import { FIGS as concepts_basics } from './concepts/basics.js';
import { FIGS as concepts_data } from './concepts/data.js';
import { FIGS as concepts_reliability } from './concepts/reliability.js';
import { FIGS as concepts_coordination } from './concepts/coordination.js';
import { FIGS as concepts_patterns } from './concepts/patterns.js';
import { FIGS as concepts_specialised } from './concepts/specialised.js';
import { FIGS as concepts_networking } from './concepts/networking.js';
import { FIGS as concepts_api_design } from './concepts/api-design.js';
import { FIGS as concepts_data_modelling } from './concepts/data-modelling.js';
import { FIGS as concepts_caching } from './concepts/caching.js';
import { FIGS as concepts_sharding } from './concepts/sharding.js';
import { FIGS as concepts_consistent_hashing } from './concepts/consistent-hashing.js';
import { FIGS as concepts_cap } from './concepts/cap.js';
import { FIGS as concepts_indexing } from './concepts/indexing.js';
import { FIGS as concepts_numbers } from './concepts/numbers.js';
import { FIGS as concepts_realtime } from './concepts/realtime.js';
import { FIGS as components_edge } from './components/edge.js';
import { FIGS as components_compute } from './components/compute.js';
import { FIGS as components_storage } from './components/storage.js';
import { FIGS as components_messaging } from './components/messaging.js';
import { FIGS as components_tools } from './components/tools.js';
import { FIGS as interview_questions_start } from './interview-questions/start.js';
import { FIGS as interview_questions_easy } from './interview-questions/easy.js';
import { FIGS as interview_questions_medium } from './interview-questions/medium.js';
import { FIGS as papers_must_know } from './papers/must-know.js';
import { FIGS as papers_worth_reading } from './papers/worth-reading.js';

export const FIGS = new Set([
  ...concepts_basics,
  ...concepts_data,
  ...concepts_reliability,
  ...concepts_coordination,
  ...concepts_patterns,
  ...concepts_specialised,
  ...concepts_networking,
  ...concepts_api_design,
  ...concepts_data_modelling,
  ...concepts_caching,
  ...concepts_sharding,
  ...concepts_consistent_hashing,
  ...concepts_cap,
  ...concepts_indexing,
  ...concepts_numbers,
  ...concepts_realtime,
  ...components_edge,
  ...components_compute,
  ...components_storage,
  ...components_messaging,
  ...components_tools,
  ...interview_questions_start,
  ...interview_questions_easy,
  ...interview_questions_medium,
  ...papers_must_know,
  ...papers_worth_reading,
]);
