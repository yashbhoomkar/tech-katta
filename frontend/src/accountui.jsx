// Sign in with Google, as the page shows it (state and sync live in account.js). Used by the landing
// page header (the place to sign in), the landing IND vs PAK result (an invite after a score), and the
// dashboard header (only once signed in: the avatar menu, no sign-in button there).
import React,{useEffect,useRef,useState}from"react";import{useTheme}from"./theme/mode.js";import{account,renderGoogleButton,signOut,signOutAll,deleteAccount,setTermsChoice,setAdsConsent}from"./account.js";import{track}from"./analytics.js";import"./account.css";

export function useAccount(){const[s,set]=useState(account);useEffect(()=>{const on=()=>set(account());on();addEventListener("tk-account",on);return()=>removeEventListener("tk-account",on)},[]);return s}

// Google's own button, drawn into a div (Google Identity Services). `text` is Google's label preset.
export function GoogleButton({t,text="signin_with"}){const g=useRef(null),a=useAccount(),theme=useTheme();const[blocked,setBlocked]=useState(false);
useEffect(()=>{if(a.ready&&a.enabled&&!a.user&&g.current)renderGoogleButton(g.current,{text}).then(()=>setBlocked(false),()=>setBlocked(true))},[a.ready,a.enabled,a.user,text,theme]);
return <span className="acct-gwrap"><span ref={g} className="acct-g"/>{blocked&&t?.googleBlocked&&<span className="acct-err" role="alert">{t.googleBlocked}</span>}</span>}

// Header control. Signed out: Google's button (unless `button` is false). Signed in: avatar + menu.
export function AccountControl({t,privacyHref="#privacy",button=true,signInHref,termsBase="/dashboard/"}){const a=useAccount(),box=useRef(null);const[open,setOpen]=useState(false),[signing,setSigning]=useState(false);
useEffect(()=>{if(!open)return;const k=e=>{if(e.key==="Escape")setOpen(false)};const m=e=>{if(!box.current?.contains(e.target))setOpen(false)};addEventListener("keydown",k);addEventListener("pointerdown",m,true);return()=>{removeEventListener("keydown",k);removeEventListener("pointerdown",m,true)}},[open]);
if(!t||!a.ready||!a.enabled)return null;
// signed out: Sign in opens a dialog right here (the Terms box and Google's button); without its copy, the
// header only points to the sign-in card on the page
if(!a.user){if(!button)return null;if(t.signInDialog)return <div className="acct"><button type="button" className="acct-signin-link" aria-haspopup="dialog" onClick={()=>setSigning(true)}>{t.signIn}</button>{signing&&<SignInDialog t={t} base={termsBase} onClose={()=>setSigning(false)}/>}</div>;
return signInHref?<div className="acct"><a className="acct-signin-link" href={signInHref}>{t.signIn}</a></div>:null}
const who=a.user.name||a.user.email||t.menu;
return <div className="acct" ref={box}><button type="button" className="acct-btn" aria-expanded={open} aria-haspopup="true" aria-label={`${t.menu}: ${who}`} onClick={()=>setOpen(o=>!o)}>{a.user.picture?<img src={a.user.picture} alt="" referrerPolicy="no-referrer"/>:<i aria-hidden="true">{who[0].toUpperCase()}</i>}<span>{who}</span></button>
{open&&<div className="acct-menu"><b>{a.user.name}</b><small>{a.user.email}</small><p className={a.error?"bad":""}>{a.syncing?t.syncing:a.error?t.syncFailed:t.saved}</p>
{t.adsMenu&&<AdsSwitch t={t} on={!!a.user.adsConsent}/>}
<a href={privacyHref} onClick={()=>setOpen(false)}>{t.privacy}</a><button type="button" onClick={()=>{setOpen(false);signOut()}}>{t.signOut}</button>
{t.signOutAll&&<button type="button" onClick={async()=>{if(confirm(t.signOutAllConfirm)){setOpen(false);try{await signOutAll()}catch{alert(t.syncFailed)}}}}>{t.signOutAll}</button>}
<button type="button" className="danger" onClick={async()=>{if(confirm(t.deleteConfirm)){setOpen(false);try{await deleteAccount()}catch{alert(t.syncFailed)}}}}>{t.delete}</button></div>}</div>}

// The header's sign-in, as a dialog over the page: Esc, the close button or a tap outside closes it, and focus
// goes back to the Sign in button. Signing in closes it (the header then shows the account button).
function SignInDialog({t,base,onClose}){const d=useRef(null),a=useAccount(),x=t.signInDialog;
useEffect(()=>{const el=d.current;try{el.showModal()}catch{el.setAttribute("open","")}const c=()=>onClose();el.addEventListener("close",c);return()=>{el.removeEventListener("close",c);if(el.open)el.close()}},[]);// eslint-disable-line
return <dialog ref={d} className="acct-dialog" aria-labelledby="acct-dlg-t" onClick={e=>{if(e.target===d.current)d.current.close()}}><div className="acct-dialog-card">
<button type="button" className="acct-dialog-x" aria-label={x.close||t.signIn} onClick={()=>d.current.close()}>✕</button>
<b id="acct-dlg-t">{x.title}</b><p>{x.text}</p><SignInBox t={t} base={base}/>{a.error&&<span className="acct-err" role="alert">{t.signInFailed}</span>}</div></dialog>}

// Under a challenge score while signed out: why signing in helps, and the button right there.
export function KeepStars({t}){const a=useAccount();if(!t?.keepStars||!a.ready||!a.enabled||a.user)return null;
return <div className="acct-keep"><p>{t.keepStars}</p><SignInBox t={t} base="/dashboard/"/>{a.error&&<span className="acct-err" role="alert">{t.signInFailed}</span>}</div>}

// Opt-in box shown next to a sign-in button: unticked; the choice goes with the sign-in.
// Signing in: the Terms box (required, unticked) and Google's button, which can't be used until the
// box is ticked; a tap on it before that says so.
export function SignInBox({t,base="",text="continue_with"}){const[on,setOn]=useState(false),[hint,setHint]=useState(false);useEffect(()=>()=>setTermsChoice(false),[]);
const tick=v=>{setOn(v);setTermsChoice(v);if(v)setHint(false)};
return <div className="acct-signin"><label className={"acct-consent"+(hint?" hint":"")}><input type="checkbox" checked={on} onChange={e=>tick(e.target.checked)} required/><span>{t.agree} <a href={base+"#terms"}>{t.termsLink}</a> {t.and} <a href={base+"#privacy"}>{t.privacyLink}</a>.</span></label>
<div className={"acct-gate"+(on?"":" off")}><GoogleButton t={t} text={text}/>{!on&&<button type="button" className="acct-gate-cover" aria-label={t.agreeFirst} onClick={()=>setHint(true)}/>}</div>
{hint&&!on&&<span className="acct-err" role="alert">{t.agreeFirst}</span>}</div>}

// The landing page Lab: blurred and locked until the visitor signs in with Google (owner, 11-04).
// When sign-in is off on the API, the Lab is open as before.
// (inert is set on the element itself: nothing behind the card can be clicked, tapped or tabbed to)
const inert=el=>{if(el)el.inert=true};
export function LabLock({t,lock,lite,children}){const a=useAccount(),seen=useRef(false);const waiting=!!(t&&lock&&!a.ready),locked=!!(t&&lock&&a.ready&&a.enabled&&!a.user);
useEffect(()=>{if(locked&&!seen.current){seen.current=true;track("lab_locked",{lite:!!lite})}},[locked,lite]);
if(waiting)return <div className="lock"><div className="lock-blur" ref={inert} aria-hidden="true">{children}</div></div>;
if(!locked)return children;
return <div className="lock"><div className="lock-blur" ref={inert} aria-hidden="true">{children}</div>
<div className="lock-card" role="region" aria-label={lock.title}><b>{lock.title}</b><p>{lock.text}</p><SignInBox t={t} base="/dashboard/"/>{a.error&&<span className="acct-err" role="alert">{a.error==="terms_required"?t.agreeFirst:t.signInFailed}</span>}</div></div>}

// A dashboard tab while signed out (owner, 11-05): a blurred stand-in (the real page isn't loaded, so
// nothing is fetched and no "opened" events are counted) under the sign-in card naming the page.
export function PageLock({t,lock,title,section,slug=""}){const a=useAccount(),seen=useRef(false);
useEffect(()=>{if(!seen.current){seen.current=true;track("page_locked",{section,slug})}},[section,slug]);
return <div className="lock lock-page"><div className="lock-blur lock-skel" ref={inert} aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div>
<div className="lock-card" role="region" aria-label={lock.title}><b>{lock.title}</b>{title&&<em>{title}</em>}<p>{lock.text}</p><SignInBox t={t}/>{a.error&&<span className="acct-err" role="alert">{a.error==="terms_required"?t.agreeFirst:t.signInFailed}</span>}</div></div>}

// Under the public preview of an article while signed out (owner, 2026-11-13, like fanout.sh): the opening
// is readable (and in the page's HTML for search engines), the rest is behind this card.
export function PreviewLock({t,lock,section,slug}){const a=useAccount(),seen=useRef(false);
useEffect(()=>{if(!seen.current){seen.current=true;track("page_locked",{section,slug,preview:true})}},[section,slug]);
return <div className="lock-card lock-inline" role="region" aria-label={lock.title}><small>{lock.eyebrow}</small><b>{lock.title}</b><p>{lock.text}</p><SignInBox t={t} base="/dashboard/"/>{a.error&&<span className="acct-err" role="alert">{a.error==="terms_required"?t.agreeFirst:t.signInFailed}</span>}</div>}

// Account menu switch for the ads opt-in: flips at once, goes back if the API can't be reached.
function AdsSwitch({t,on}){const[v,setV]=useState(on);useEffect(()=>setV(on),[on]);
return <label className="acct-ads"><input type="checkbox" checked={v} onChange={e=>{const want=e.target.checked;setV(want);setAdsConsent(want).catch(()=>{setV(!want);alert(t.syncFailed)})}}/><span>{t.adsMenu}</span></label>}
