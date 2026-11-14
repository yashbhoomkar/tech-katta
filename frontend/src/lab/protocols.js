// How two components talk: the protocol an arrow carries, shown as a pill on the arrow and by the line's colour
// and dash (solid: a request that waits for its answer; dashed: a message or a push; dotted: a data read or write).
// An arrow without a chosen protocol shows the usual one for the two parts it joins (inferProtocol), so every
// arrow on the canvas says how its parts talk. A protocol and a label are drawing only: the judge never reads them.
export const PROTOCOLS=[
  {id:"https",name:"HTTPS",color:"teal",dash:"solid"},
  {id:"rest",name:"REST",color:"teal",dash:"solid"},
  {id:"grpc",name:"gRPC",color:"green",dash:"solid"},
  {id:"graphql",name:"GraphQL",color:"pink",dash:"solid"},
  {id:"websocket",name:"WebSocket",color:"violet",dash:"dash"},
  {id:"sse",name:"SSE",color:"violet",dash:"dash"},
  {id:"webhook",name:"Webhook",color:"amber",dash:"solid"},
  {id:"tcp",name:"TCP",color:"ink",dash:"solid"},
  {id:"query",name:"DB query",color:"amber",dash:"dot"},
  {id:"lookup",name:"Key lookup",color:"amber",dash:"dot"},
  {id:"message",name:"Message",color:"pink",dash:"dash"},
  {id:"event",name:"Event",color:"pink",dash:"dash"},
  {id:"pubsub",name:"Pub/Sub",color:"pink",dash:"dash"},
  {id:"cdc",name:"CDC",color:"green",dash:"dash"},
];
export const PROTOCOL=Object.assign(Object.create(null),Object.fromEntries(PROTOCOLS.map(p=>[p.id,p])));// no prototype: "__proto__" is not a protocol
// stroke-dasharray for each line style
export const DASH={solid:undefined,dash:"7 4",dot:"2 3"};
export const MAX_LABEL=32;

// The usual protocol between two kinds of component (types from lab.json and eval.json).
export function inferProtocol(from,to){
  if(from==="database")return"cdc";                       // change data capture into a queue or stream
  if(to==="database")return"query";
  if(to==="cache")return"lookup";
  for(const[k,p]of[["queue","message"],["stream","event"],["pubsub","pubsub"]])if(to===k||from===k)return p;
  if(from==="client")return to==="realtime"?"websocket":"https";
  if(to==="external")return"https";
  if(from==="external")return"webhook";
  if(from==="cdn")return"https";
  if(from==="lb"||from==="apigw")return"rest";
  return"grpc";
}
// The protocol an arrow shows: the one chosen for it, else the usual one.
export const protocolOf=(data,from,to)=>PROTOCOL[data?.protocol]||PROTOCOL[inferProtocol(from,to)];
// An arrow's own label: printable text, spaces collapsed, at most MAX_LABEL characters; empty means none.
export const cleanLabel=v=>typeof v==="string"?v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g," ").replace(/\s+/g," ").trim().slice(0,MAX_LABEL):"";
// The drawing fields an arrow keeps when a design is saved, synced or loaded (store.js cleanDesign).
export function cleanArrowLook(e){const out={};if(e&&typeof e==="object"){if(typeof e.protocol==="string"&&PROTOCOL[e.protocol])out.protocol=e.protocol;const l=cleanLabel(e.label);if(l)out.label=l}return out}
