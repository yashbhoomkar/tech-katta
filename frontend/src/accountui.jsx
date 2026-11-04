// Sign in with Google, as the page shows it (state and sync live in account.js). Used by the landing
// page header (the place to sign in), the landing IND vs PAK result (an invite after a score), and the
// dashboard header (only once signed in: the avatar menu, no sign-in button there).
import React,{useEffect,useRef,useState}from"react";import{account,renderGoogleButton,signOut,deleteAccount}from"./account.js";import"./account.css";

export function useAccount(){const[s,set]=useState(account);useEffect(()=>{const on=()=>set(account());on();addEventListener("tk-account",on);return()=>removeEventListener("tk-account",on)},[]);return s}

// Google's own button, drawn into a div (Google Identity Services). `text` is Google's label preset.
export function GoogleButton({t,text="signin_with"}){const g=useRef(null),a=useAccount();const[blocked,setBlocked]=useState(false);
useEffect(()=>{if(a.ready&&a.enabled&&!a.user&&g.current)renderGoogleButton(g.current,{text}).then(()=>setBlocked(false),()=>setBlocked(true))},[a.ready,a.enabled,a.user,text]);
return <span className="acct-gwrap"><span ref={g} className="acct-g"/>{blocked&&t?.googleBlocked&&<span className="acct-err" role="alert">{t.googleBlocked}</span>}</span>}

// Header control. Signed out: Google's button (unless `button` is false). Signed in: avatar + menu.
export function AccountControl({t,privacyHref="#privacy",button=true,text}){const a=useAccount(),box=useRef(null);const[open,setOpen]=useState(false);
useEffect(()=>{if(!open)return;const k=e=>{if(e.key==="Escape")setOpen(false)};const m=e=>{if(!box.current?.contains(e.target))setOpen(false)};addEventListener("keydown",k);addEventListener("pointerdown",m,true);return()=>{removeEventListener("keydown",k);removeEventListener("pointerdown",m,true)}},[open]);
if(!t||!a.ready||!a.enabled)return null;
if(!a.user)return button?<div className="acct"><GoogleButton t={t} text={text}/>{a.error&&<span className="acct-err" role="alert">{t.signInFailed}</span>}</div>:null;
const who=a.user.name||a.user.email||t.menu;
return <div className="acct" ref={box}><button type="button" className="acct-btn" aria-expanded={open} aria-haspopup="true" aria-label={`${t.menu}: ${who}`} onClick={()=>setOpen(o=>!o)}>{a.user.picture?<img src={a.user.picture} alt="" referrerPolicy="no-referrer"/>:<i aria-hidden="true">{who[0].toUpperCase()}</i>}<span>{who}</span></button>
{open&&<div className="acct-menu"><b>{a.user.name}</b><small>{a.user.email}</small><p className={a.error?"bad":""}>{a.syncing?t.syncing:a.error?t.syncFailed:t.saved}</p>
<a href={privacyHref} onClick={()=>setOpen(false)}>{t.privacy}</a><button type="button" onClick={()=>{setOpen(false);signOut()}}>{t.signOut}</button>
<button type="button" className="danger" onClick={async()=>{if(confirm(t.deleteConfirm)){setOpen(false);try{await deleteAccount()}catch{alert(t.syncFailed)}}}}>{t.delete}</button></div>}</div>}

// Under a challenge score while signed out: why signing in helps, and the button right there.
export function KeepStars({t}){const a=useAccount();if(!t?.keepStars||!a.ready||!a.enabled||a.user)return null;
return <div className="acct-keep"><p>{t.keepStars}</p><GoogleButton t={t} text="continue_with"/>{a.error&&<span className="acct-err" role="alert">{t.signInFailed}</span>}</div>}
