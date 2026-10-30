// Edit all page copy and placeholder records in this file.
export const content={
brand:{name:"TECH KATTA",descriptor:"SYSTEMS KNOWLEDGE",footer:"An engineering knowledge publication for distributed systems and software architecture.",footerNote:"Written and maintained by one engineer. Corrections welcome."},
nav:[["Concepts","#concepts"],["Components","#components"],["Interview Questions","#problems"],["Quick Notes","#notes"]],
hero:{eyebrow:"FIELD NOTES / DISTRIBUTED SYSTEMS",title:"System design, explained.",description:"Concepts, components and interview questions. For each one: how it works, where it fails, and what you trade away by using it.",primary:"Dashboard",secondary:"Quick Notes",figure:"FIG. 01 — KAFKA: PRODUCER, BROKER, CONSUMER GROUP",status:"2 PARTITIONS · 2 CONSUMERS",caption:"Each key hashes to one partition, so order holds per key. Each consumer in the group owns one partition and reads it in offset order; records stay in the log after they are read."},
topics:{eyebrow:"01 / TECHNICAL LIBRARY",title:"Concepts · Components · Interview Questions",index:"INDEX: ARCHITECTURAL FOUNDATIONS",cards:[
{ id:"concepts",no:"SECTION // 01",kind:"PARADIGMS",title:"Concepts",desc:"Explain the fundamental ideas behind distributed systems and modern software architecture—from consensus to consistency models.",foot:"FOUNDATIONS",link:"Explore Concepts",visual:"cap"},
{ id:"components",no:"SECTION // 02",kind:"INFRASTRUCTURE",title:"Core Components",desc:"How load balancers, caches, queues and databases work, and what each one costs you when you add it to a system.",foot:"LB · CACHE · QUEUE · DB",link:"Explore Components",visual:"path"},
{ id:"problems",no:"SECTION // 03",kind:"PRACTICE",title:"Interview Questions",desc:"Common system design questions, like a URL shortener or a rate limiter, worked from requirements and rough numbers to a design you can defend.",foot:"REQUIREMENTS TO DESIGN",link:"Explore Questions",visual:"steps"}]},
notes:{eyebrow:"02 / QUICK NOTES",title:"Quick Notes",desc:"Short notes on one system at a time: how it works, where it breaks, and the trade-off it makes. Each one is a few minutes' read.",items:[
["01","Kafka: how a record travels from producer to consumer","Messaging","DRAFT"],
["02","Raft: leader election and log matching","Consensus","PLANNED"],
["03","Redis Cluster: hash slots and failover","Caching","PLANNED"],
["04","Rate limiting: token bucket vs sliding window","Edge","PLANNED"]],all:"See all quick notes"},
principles:{eyebrow:"03 / ARCHITECTURAL PRINCIPLES",title:"“Every component you add is a trade-off you have to be able to explain.”",figure:"FIG. 02 — ARCHITECTURAL TRADE-OFF MATRIX",items:[
["APPROACH A: COHESIVE MONOLITH","IN-PROCESS CALLS","Zero network boundaries between domain models. ACID transactions guaranteed. Bottleneck emerges strictly on unified database write IOPS under extreme scale.","FAILURE MODE: whole process"],
["APPROACH B: DISTRIBUTED SERVICES","NETWORK CALLS","Independent team deployability, but introduces distributed transactions (Sagas), dual-writes, cascading network timeouts, and eventual consistency lag.","FAILURE MODE: partial failure"]],conclusion:"Conclusion: Every distributed boundary converts compile-time safety into runtime network unreliability."},
closing:{eyebrow:"04 / KEEP READING",title:"Start with one system and follow it end to end.",desc:"Each note takes one system, shows the moving parts, and states the trade-off it makes.",cta:"Browse quick notes"},
footer:{label:"TECH KATTA / SYSTEMS KNOWLEDGE",updated:"Last updated: [date]",links:["Concepts","Components","Interview Questions","Quick Notes","GitHub","RSS"]}
};