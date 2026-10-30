// Edit all page copy and placeholder records in this file.
export const content={
brand:{name:"TECH KATTA",descriptor:"SYSTEMS KNOWLEDGE",footer:"An engineering knowledge publication for distributed systems and software architecture.",footerNote:"Written and maintained by one engineer. Corrections welcome."},
nav:[["Concepts","#concepts"],["Components","#components"],["Problems","#problems"],["Notes","#notes"]],
hero:{eyebrow:"FIELD NOTES / DISTRIBUTED SYSTEMS",title:"Field notes on distributed systems.",description:"Dissecting how Kafka, consensus quorums, caches, and storage engines behave under real workloads — and the trade-offs behind each architecture.",primary:"Browse notes",secondary:"Explore topics",figure:"FIG. 01 — REPLICATED WRITE, MAJORITY ACK",status:"MAJORITY = 2 OF 3",caption:"Acknowledge after a majority: faster than waiting for all, safer than waiting for one."},
topics:{eyebrow:"01 / TECHNICAL LIBRARY",title:"Topics & Systems",index:"INDEX: ARCHITECTURAL FOUNDATIONS",cards:[
{ id:"concepts",no:"SECTION // 01",kind:"PARADIGMS",title:"Concepts",desc:"Explain the fundamental ideas behind distributed systems and modern software architecture—from consensus to consistency models.",foot:"FOUNDATIONS",link:"Explore Concepts",visual:"quorum"},
{ id:"components",no:"SECTION // 02",kind:"PRIMITIVES",title:"Components",desc:"Explore the infrastructure building blocks used to construct software systems—gateways, message brokers, caches, and storage engines.",foot:"BUILDING BLOCKS",link:"Explore Components",visual:"components"},
{ id:"problems",no:"SECTION // 03",kind:"SYNTHESIS",title:"Problems",desc:"Reason about system-design requirements, architectural decisions, and trade-offs through real-world production scenarios.",foot:"ANALYSIS & TRADEOFFS",link:"Explore Problems",visual:"requirements"}]},
notes:{eyebrow:"02 / FIELD NOTES INDEX",title:"Field Notes",desc:"Rigorous engineering writeups analyzing production failure modes, concurrency guarantees, and algorithmic trade-offs.",items:[
["01","Kafka: how a record travels from producer to consumer","Messaging","DRAFT"],
["02","Raft: leader election and log matching","Consensus","PLANNED"],
["03","Redis Cluster: hash slots and failover","Caching","PLANNED"],
["04","Rate limiting: token bucket vs sliding window","Edge","PLANNED"]],all:"See all notes"},
principles:{eyebrow:"03 / ARCHITECTURAL PRINCIPLES",title:"“Every component you add is a trade-off you have to be able to explain.”",figure:"FIG. 02 — ARCHITECTURAL TRADE-OFF MATRIX",items:[
["APPROACH A: COHESIVE MONOLITH","IN-PROCESS CALLS","Zero network boundaries between domain models. ACID transactions guaranteed. Bottleneck emerges strictly on unified database write IOPS under extreme scale.","FAILURE MODE: whole process"],
["APPROACH B: DISTRIBUTED SERVICES","NETWORK CALLS","Independent team deployability, but introduces distributed transactions (Sagas), dual-writes, cascading network timeouts, and eventual consistency lag.","FAILURE MODE: partial failure"]],conclusion:"Conclusion: Every distributed boundary converts compile-time safety into runtime network unreliability."},
closing:{eyebrow:"04 / KEEP READING",title:"Start with one system and follow it end to end.",desc:"Each note takes one system, shows the moving parts, and states the trade-off it makes.",cta:"Browse notes"},
footer:{label:"TECH KATTA / SYSTEMS KNOWLEDGE",updated:"Last updated: [date]",links:["Concepts","Components","Problems","Notes","GitHub","RSS"]}
};