// Storage can be blocked (private modes, site settings): every read and write is optional (QA M1).
export const lsGet=k=>{try{return localStorage.getItem(k)}catch{return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
