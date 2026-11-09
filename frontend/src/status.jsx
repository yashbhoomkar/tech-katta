import React from"react";import"./status.css";
// Shown while content loads from the API, and if it cannot be reached.
export const Loading=({label="Loading"})=><div className="st" role="status" aria-live="polite"><i/><span>{label}…</span></div>;
// Catches a render error anywhere below it and shows a message with Reload, instead of a blank page.
export class Boundary extends React.Component{constructor(p){super(p);this.state={err:null}}static getDerivedStateFromError(err){return{err}}componentDidCatch(e){console.warn("Tech Katta:",e)}
render(){return this.state.err?<div className="st st-err" role="alert"><b>Something went wrong on this page.</b><span>Reloading usually fixes it.</span><button type="button" onClick={()=>location.reload()}>Reload</button></div>:this.props.children}}
// Around one part of a page, such as a figure: if it fails to draw, only that part is replaced by
// `fallback` (nothing by default), and the rest of the page keeps working.
export class Part extends React.Component{constructor(p){super(p);this.state={err:null}}static getDerivedStateFromError(err){return{err}}componentDidCatch(e){console.warn("Tech Katta (part):",e)}
render(){return this.state.err?(this.props.fallback??null):this.props.children}}
export const LoadError=({retry,what="this page"})=><div className="st st-err" role="alert"><b>Couldn't load {what}.</b><span>Check your connection and try again.</span><button type="button" onClick={retry}>Try again</button></div>;
