// Figure ids the frontend can draw, one list per sub-tab: backend/src/content/figs/<tab>/<sub-tab>.js mirrors
// frontend/src/figs/<tab>/<sub-tab>.jsx, and a test checks that each pair has the same ids.
import { FIGS as concepts_patterns } from './concepts/patterns.js';
import { FIGS as concepts_specialised } from './concepts/specialised.js';
import { FIGS as concepts_networking_essentials } from './concepts/networking-essentials.js';
import { FIGS as concepts_api_design } from './concepts/api-design.js';
import { FIGS as concepts_data_modelling } from './concepts/data-modelling.js';
import { FIGS as concepts_caching } from './concepts/caching.js';
import { FIGS as concepts_sharding } from './concepts/sharding.js';
import { FIGS as concepts_consistent_hashing } from './concepts/consistent-hashing.js';
import { FIGS as concepts_cap_theorem } from './concepts/cap-theorem.js';
import { FIGS as concepts_database_indexing } from './concepts/database-indexing.js';
import { FIGS as concepts_numbers_to_know } from './concepts/numbers-to-know.js';
import { FIGS as concepts_real_time_updates } from './concepts/real-time-updates.js';
import { FIGS as components_tools } from './components/tools.js';
import { FIGS as interview_questions_start } from './interview-questions/start.js';
import { FIGS as interview_questions_easy } from './interview-questions/easy.js';
import { FIGS as interview_questions_medium } from './interview-questions/medium.js';
import { FIGS as interview_questions_hard } from './interview-questions/hard.js';
import { FIGS as real_systems_case_studies } from './real-systems/case-studies.js';

export const FIGS = new Set([
  ...concepts_patterns,
  ...concepts_specialised,
  ...concepts_networking_essentials,
  ...concepts_api_design,
  ...concepts_data_modelling,
  ...concepts_caching,
  ...concepts_sharding,
  ...concepts_consistent_hashing,
  ...concepts_cap_theorem,
  ...concepts_database_indexing,
  ...concepts_numbers_to_know,
  ...concepts_real_time_updates,
  ...components_tools,
  ...interview_questions_start,
  ...interview_questions_easy,
  ...interview_questions_medium,
  ...interview_questions_hard,
  ...real_systems_case_studies,
]);
