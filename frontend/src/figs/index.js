// Every figure an article can show, by id: { C: the component, ar: its aspect ratio, title: n => the
// heading (n is the example system's name) }. A new figure module exports its own map and is added here;
// the backend's FIGS set (backend/src/content/validate.js) must list the same ids, and a backend test checks it.
import{APITYPE_FIGS}from"./apitypes.jsx";
import{COMPONENT_FIGS}from"./components.jsx";
import{CONCEPT_FIGS}from"./concepts.jsx";
import{QUESTION_FIGS}from"./questions.jsx";
import{PAPER_FIGS}from"./papers.jsx";
import{TOOL_FIGS}from"./tools.jsx";
import{NETWORK_FIGS}from"./network.jsx";
import{API_FIGS}from"./apidesign.jsx";
import{DM_FIGS}from"./datamodel.jsx";
import{CACHE_FIGS}from"./caching.jsx";
import{SHARD_FIGS}from"./sharding.jsx";
import{HASH_FIGS}from"./hashing.jsx";
import{CAP_FIGS}from"./cap.jsx";
import{INDEX_FIGS}from"./indexing.jsx";
import{NUM_FIGS}from"./numbers.jsx";
import{RT_FIGS}from"./realtime.jsx";

export const FIGS={...APITYPE_FIGS,...COMPONENT_FIGS,...CONCEPT_FIGS,...QUESTION_FIGS,...PAPER_FIGS,...TOOL_FIGS,...NETWORK_FIGS,...API_FIGS,...DM_FIGS,...CACHE_FIGS,...SHARD_FIGS,...HASH_FIGS,...CAP_FIGS,...INDEX_FIGS,...NUM_FIGS,...RT_FIGS};
