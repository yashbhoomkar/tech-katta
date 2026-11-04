// Sign in with Google (optional) and keeping a signed-in user's Lab designs and stars in their account.
// Signed out, everything stays in this browser as before. Signed in, this browser's Lab data and the
// account's are merged (lab/merge.js, the same rules the API uses) on sign-in, when the Lab opens,
// and a few seconds after each change, so the same designs and stars show up on every device.
import{API}from"./api.js";import{STORE_KEY,STORE_VERSION,readStore}from"./lab/store.js";import{mergeLab}from"./lab/merge.js";
import{readProgress,replaceProgress}from"./progress.js";import{track}from"./analytics.js";

export const DELETED_KEY="tk-lab-deleted";// {design id: when it was deleted}, so deletions reach other devices
const call=async(path,{method="GET",body}={})=>{const r=await fetch(API+path,{method,credentials:"include",headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
let data=null;try{data=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(data?.error||`HTTP ${r.status}`),{status:r.status});return data};

// --- account state, shared by every part of the page ("tk-account" event on change)
let state={ready:false,enabled:false,user:null,clientId:null,syncing:false,error:null};
const emit=()=>{try{dispatchEvent(new Event("tk-account"))}catch{}};
const setState=p=>{state={...state,...p};emit()};
export const account=()=>state;
let started=null;
export function startAccount(){return started||=(async()=>{try{const cfg=await call("/v1/auth/config");if(!cfg?.enabled){setState({ready:true,enabled:false});return}
setState({enabled:true,clientId:cfg.clientId});try{const me=await call("/v1/me");setState({ready:true,user:me.user})}catch{setState({ready:true,user:null})}if(state.user)syncLab()}
catch{setState({ready:true,enabled:false})}})()}

// --- Google Identity Services (loaded only when sign-in is on)
let gis=null;
export function loadGoogle(){return gis||=new Promise((res,rej)=>{if(window.google?.accounts?.id)return res(window.google);const s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;s.onload=()=>window.google?.accounts?.id?res(window.google):rej(new Error("gis"));s.onerror=()=>{gis=null;rej(new Error("gis"))};document.head.appendChild(s)})}
let initialised=false;
export async function renderGoogleButton(el,{text="signin_with"}={}){const g=await loadGoogle();if(!initialised){g.accounts.id.initialize({client_id:state.clientId,callback:r=>signIn(r.credential),ux_mode:"popup",auto_select:false,itp_support:true,use_fedcm_for_prompt:true});initialised=true}
g.accounts.id.renderButton(el,{type:"standard",theme:"outline",size:"medium",text,shape:"rectangular",logo_alignment:"left"})}
// The "show me Tech Katta updates on Facebook and Instagram" box next to a sign-in button (opt-in;
// unticked by default). Read when Google hands back the credential.
let adsChoice=false;export const setAdsChoice=v=>{adsChoice=!!v};
export async function signIn(credential){setState({error:null});try{const r=await call("/v1/auth/google",{method:"POST",body:{credential,adsConsent:adsChoice}});setState({user:r.user});track("sign_in",{ads:adsChoice});await syncLab()}catch(e){setState({error:"sign_in_failed"})}}
export async function signOut(){track("sign_out");try{await call("/v1/auth/signout",{method:"POST"})}catch{}try{window.google?.accounts?.id?.disableAutoSelect()}catch{}setState({user:null})}
// Opt in or out later, from the account menu.
export async function setAdsConsent(ads){const r=await call("/v1/me/consent",{method:"POST",body:{ads:!!ads}});setState({user:r.user});track("ads_consent",{ads:!!ads})}
// Every device signed in to this account is signed out (lost phone, shared computer).
export async function signOutAll(){track("sign_out_all");await call("/v1/auth/signout-all",{method:"POST"});try{window.google?.accounts?.id?.disableAutoSelect()}catch{}setState({user:null})}
export async function deleteAccount(){await call("/v1/me",{method:"DELETE"});track("delete_account");try{window.google?.accounts?.id?.disableAutoSelect()}catch{}setState({user:null})}

// --- Lab sync
const readJSON=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}};
const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
// this browser's Lab data, in the shape merge.js uses
function localLab(lab){let raw=null;try{raw=localStorage.getItem(STORE_KEY)}catch{}const store=readStore(raw,lab),del=readJSON(DELETED_KEY);
return{store,data:{designs:Object.values(store.designs),deleted:del&&typeof del==="object"?Object.entries(del).map(([id,at])=>({id,at})):[],progress:readProgress()}}}
// Remember a deleted design so the deletion syncs (called by the Lab).
export function noteDeleted(id){const d=readJSON(DELETED_KEY)||{};d[id]=Date.now();writeJSON(DELETED_KEY,d)}
let catalogue=null,timer=0,running=null;
export const useCatalogue=lab=>{catalogue=lab};
async function labCatalogue(){if(catalogue)return catalogue;const{getJSON}=await import("./api.js");return catalogue=await getJSON("/v1/lab")}
// Merge with the account now (no-op when signed out). Resolves when done; never throws.
export function syncLab(){if(!state.user)return Promise.resolve(false);if(running)return running;
running=(async()=>{setState({syncing:true});try{const lab=await labCatalogue();const sent=localLab(lab).data;const remote=await call("/v1/me/lab",{method:"POST",body:sent});
// whatever changed here while the request was out is merged in again, so nothing local is lost
const now=localLab(lab),merged=mergeLab(now.data,remote,lab);const designs=Object.create(null);for(const d of merged.designs)designs[d.id]=d;
writeJSON(STORE_KEY,{version:STORE_VERSION,current:designs[now.store.current]?now.store.current:merged.designs[0]?.id,designs});
writeJSON(DELETED_KEY,Object.fromEntries(merged.deleted.map(d=>[d.id,d.at])));replaceProgress(merged.progress);
try{dispatchEvent(new Event("tk-lab-synced"))}catch{}setState({syncing:false,error:null,lastSync:Date.now()});return true}
catch(e){if(e.status===401)setState({user:null,syncing:false});else setState({syncing:false,error:"sync_failed"});return false}finally{running=null}})();return running}
// a few seconds after a change (Lab saves, stars), so bursts of edits make one request
export function syncSoon(){if(!state.user)return;clearTimeout(timer);timer=setTimeout(syncLab,3000)}
// Changes made on this page start a sync; the sync's own updates (detail "sync") don't.
export function wireSync(){addEventListener("tk-lab-saved",syncSoon);addEventListener("tk-progress",e=>{if(e.detail!=="sync")syncSoon()})}
