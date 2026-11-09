// Every figure an article can show, by id: { C: the component, ar: its aspect ratio, title: n => the heading
// (n is the example system's name). Each sub-tab (site.json dashboard.groups) that has figures owns one module,
// figs/<tab>/<sub-tab>.jsx, exporting FIGS, and one list of the same ids in the backend,
// backend/src/content/figs/<tab>/<sub-tab>.js. A new sub-tab adds both files and a line here and there;
// a backend test checks that every module is listed and that each pair has the same ids.
import{FIGS as concepts_basics}from"./concepts/basics.jsx";
import{FIGS as concepts_data}from"./concepts/data.jsx";
import{FIGS as concepts_reliability}from"./concepts/reliability.jsx";
import{FIGS as concepts_coordination}from"./concepts/coordination.jsx";
import{FIGS as concepts_patterns}from"./concepts/patterns.jsx";
import{FIGS as concepts_specialised}from"./concepts/specialised.jsx";
import{FIGS as concepts_networking}from"./concepts/networking.jsx";
import{FIGS as concepts_api_design}from"./concepts/api-design.jsx";
import{FIGS as concepts_data_modelling}from"./concepts/data-modelling.jsx";
import{FIGS as concepts_caching}from"./concepts/caching.jsx";
import{FIGS as concepts_sharding}from"./concepts/sharding.jsx";
import{FIGS as concepts_consistent_hashing}from"./concepts/consistent-hashing.jsx";
import{FIGS as concepts_cap}from"./concepts/cap.jsx";
import{FIGS as concepts_indexing}from"./concepts/indexing.jsx";
import{FIGS as concepts_numbers}from"./concepts/numbers.jsx";
import{FIGS as concepts_realtime}from"./concepts/realtime.jsx";
import{FIGS as components_edge}from"./components/edge.jsx";
import{FIGS as components_compute}from"./components/compute.jsx";
import{FIGS as components_storage}from"./components/storage.jsx";
import{FIGS as components_messaging}from"./components/messaging.jsx";
import{FIGS as components_tools}from"./components/tools.jsx";
import{FIGS as interview_questions_start}from"./interview-questions/start.jsx";
import{FIGS as interview_questions_easy}from"./interview-questions/easy.jsx";
import{FIGS as interview_questions_medium}from"./interview-questions/medium.jsx";
import{FIGS as papers_must_know}from"./papers/must-know.jsx";
import{FIGS as papers_worth_reading}from"./papers/worth-reading.jsx";

export const FIGS={...concepts_basics,...concepts_data,...concepts_reliability,...concepts_coordination,...concepts_patterns,...concepts_specialised,...concepts_networking,...concepts_api_design,...concepts_data_modelling,...concepts_caching,...concepts_sharding,...concepts_consistent_hashing,...concepts_cap,...concepts_indexing,...concepts_numbers,...concepts_realtime,...components_edge,...components_compute,...components_storage,...components_messaging,...components_tools,...interview_questions_start,...interview_questions_easy,...interview_questions_medium,...papers_must_know,...papers_worth_reading};
