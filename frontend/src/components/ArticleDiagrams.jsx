import React from 'react';

function Box({ x, y, width, height, title, lines = [], tone = 'default' }) {
  const stroke = tone === 'accent' ? '#cbacf9' : '#343653';
  const fill = tone === 'accent' ? 'rgba(203,172,249,0.10)' : '#090c25';
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="12" fill={fill} stroke={stroke} />
      <text x={x + 18} y={y + 25} fill="#f4f2ff" fontSize="12" fontWeight="700">{title}</text>
      {lines.map((line, index) => (
        <text key={line} x={x + 18} y={y + 46 + index * 18} fill="#9ea0b7" fontSize="10">{line}</text>
      ))}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label, dashed = false }) {
  return (
    <g>
      <defs>
        <marker id="arrow-head" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#cbacf9" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#cbacf9"
        strokeWidth="1.5"
        strokeDasharray={dashed ? '5 5' : undefined}
        markerEnd="url(#arrow-head)"
      />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fill="#686b84" fontSize="9">
          {label}
        </text>
      )}
    </g>
  );
}

export function KafkaMotivatingDiagram() {
  return (
    <div className="diagram-card">
      <div className="diagram-label">A simple event pipeline</div>
      <svg viewBox="0 0 900 250" role="img" aria-label="Producer sends match events to Kafka partitions, which are processed by consumers.">
        <Box x={30} y={82} width={180} height={86} title="Event producers" lines={['match service', 'score service', 'notification service']} />
        <Box x={360} y={34} width={180} height={70} title="Partition 0" lines={['game = Brazil–Japan']} tone="accent" />
        <Box x={360} y={122} width={180} height={70} title="Partition 1" lines={['game = India–France']} />
        <Box x={360} y={210} width={180} height={20} title="" />
        <text x="378" y="225" fill="#686b84" fontSize="9">Partition 2 ...</text>
        <Box x={690} y={82} width={180} height={86} title="Consumers" lines={['scoreboard', 'analytics', 'notifications']} />
        <Arrow x1={210} y1={125} x2={355} y2={69} label="publish" />
        <Arrow x1={210} y1={125} x2={355} y2={156} />
        <Arrow x1={545} y1={69} x2={685} y2={112} label="poll" />
        <Arrow x1={545} y1={157} x2={685} y2={138} />
      </svg>
    </div>
  );
}

export function KafkaArchitectureDiagram() {
  return (
    <div className="diagram-card">
      <div className="diagram-label">Kafka at a glance</div>
      <svg viewBox="0 0 1000 360" role="img" aria-label="Kafka architecture showing producers, a cluster of brokers with partitions and replicas, and consumer groups.">
        <Box x={24} y={118} width={170} height={110} title="Producers" lines={['orders-service', 'payments-service', 'clickstream-service']} />
        <rect x="300" y="40" width="400" height="280" rx="18" fill="#07091f" stroke="#343653" />
        <text x="326" y="70" fill="#f4f2ff" fontSize="13" fontWeight="700">Kafka cluster</text>
        <text x="326" y="89" fill="#686b84" fontSize="9">brokers store partitions</text>
        <Box x={325} y={112} width={155} height={76} title="Broker 1" lines={['P0 leader', 'P2 follower']} tone="accent" />
        <Box x={520} y={112} width={155} height={76} title="Broker 2" lines={['P1 leader', 'P0 follower']} />
        <Box x={325} y={208} width={155} height={76} title="Broker 3" lines={['P2 leader', 'P1 follower']} />
        <Box x={520} y={208} width={155} height={76} title="Broker 4" lines={['P0 follower', 'P2 follower']} />
        <Box x={806} y={118} width={170} height={110} title="Consumers" lines={['Consumer group A', 'Consumer group B', 'replay / analytics']} />
        <Arrow x1={194} y1={173} x2={295} y2={173} label="records" />
        <Arrow x1={705} y1={173} x2={801} y2={173} label="poll" />
      </svg>
    </div>
  );
}

export function KafkaPartitionDiagram() {
  return (
    <div className="diagram-card">
      <div className="diagram-label">Topics → partitions</div>
      <svg viewBox="0 0 920 300" role="img" aria-label="A topic contains multiple ordered partitions, and records with the same key go to the same partition.">
        <Box x={28} y={90} width={150} height={86} title="Topic: orders" lines={['logical stream']} tone="accent" />
        <Arrow x1={178} y1={133} x2={255} y2={64} label="key = userId" />
        <Arrow x1={178} y1={133} x2={255} y2={133} />
        <Arrow x1={178} y1={133} x2={255} y2={202} />
        <Box x={265} y={28} width={190} height={66} title="Partition 0" lines={['u42 · offset 0,1,2...']} />
        <Box x={265} y={101} width={190} height={66} title="Partition 1" lines={['u17 · offset 0,1,2...']} />
        <Box x={265} y={174} width={190} height={66} title="Partition 2" lines={['u91 · offset 0,1,2...']} />
        <text x="500" y="62" fill="#686b84" fontSize="10">ordered</text>
        <text x="500" y="76" fill="#9ea0b7" fontSize="10">offset 0 → 1 → 2 → 3</text>
        <text x="500" y="135" fill="#686b84" fontSize="10">independent</text>
        <text x="500" y="149" fill="#9ea0b7" fontSize="10">can be processed in parallel</text>
        <text x="500" y="208" fill="#686b84" fontSize="10">scaling unit</text>
        <text x="500" y="222" fill="#9ea0b7" fontSize="10">add partitions, then spread them</text>
        <Arrow x1={455} y1={61} x2={580} y2={61} />
        <Arrow x1={455} y1={134} x2={580} y2={134} />
        <Arrow x1={455} y1={207} x2={580} y2={207} />
        <Box x={595} y={96} width={280} height={82} title="What Kafka guarantees" lines={['ordering within a partition', 'not global ordering across a topic']} />
      </svg>
    </div>
  );
}

export function KafkaConsumerGroupDiagram() {
  return (
    <div className="diagram-card">
      <div className="diagram-label">Consumer groups</div>
      <svg viewBox="0 0 900 310" role="img" aria-label="Three Kafka partitions are assigned across three consumers in one group.">
        <Box x={24} y={90} width={165} height={115} title="Topic: orders" lines={['P0', 'P1', 'P2']} tone="accent" />
        <Box x={300} y={34} width={180} height={66} title="Consumer A" lines={['assigned P0']} />
        <Box x={300} y={122} width={180} height={66} title="Consumer B" lines={['assigned P1']} />
        <Box x={300} y={210} width={180} height={66} title="Consumer C" lines={['assigned P2']} />
        <Arrow x1={189} y1={112} x2={295} y2={67} />
        <Arrow x1={189} y1={148} x2={295} y2={155} />
        <Arrow x1={189} y1={184} x2={295} y2={243} />
        <Box x={620} y={84} width={245} height={120} title="Consumer group: checkout-workers" lines={['one active consumer per partition', 'add consumers up to partition count', 'another group can replay independently']} />
      </svg>
    </div>
  );
}

export function KafkaReplicationDiagram() {
  return (
    <div className="diagram-card">
      <div className="diagram-label">Replication and failure</div>
      <svg viewBox="0 0 920 290" role="img" aria-label="Kafka partition replication with one leader and two follower replicas.">
        <Box x={40} y={70} width={210} height={120} title="Broker 1" lines={['P0 — LEADER', 'accepts writes', 'serves normal reads']} tone="accent" />
        <Box x={355} y={70} width={210} height={120} title="Broker 2" lines={['P0 — FOLLOWER', 'replicates leader', 'ready to take over']} />
        <Box x={670} y={70} width={210} height={120} title="Broker 3" lines={['P0 — FOLLOWER', 'replicates leader', 'ready to take over']} />
        <Arrow x1={250} y1={130} x2={350} y2={130} label="replicate" />
        <Arrow x1={250} y1={155} x2={665} y2={155} label="replicate" />
        <text x="40" y="230" fill="#686b84" fontSize="10">If Broker 1 fails, an in-sync follower can become the new leader.</text>
      </svg>
    </div>
  );
}

export function KafkaRetryDiagram() {
  return (
    <div className="diagram-card">
      <div className="diagram-label">A common consumer retry pattern</div>
      <svg viewBox="0 0 1000 280" role="img" aria-label="Failed Kafka messages are routed to a retry topic and then a dead letter queue after repeated failures.">
        <Box x={28} y={90} width={170} height={85} title="Main topic" lines={['order-events']} tone="accent" />
        <Box x={300} y={90} width={170} height={85} title="Consumer" lines={['process message', 'commit offset']} />
        <Box x={572} y={40} width={170} height={85} title="Retry topic" lines={['delay / retry', 'consumer retries']} />
        <Box x={572} y={160} width={170} height={85} title="Dead-letter topic" lines={['manual inspection', 'alerting']} />
        <Box x={845} y={90} width={120} height={85} title="Fix + replay" lines={['controlled']} />
        <Arrow x1={198} y1={132} x2={295} y2={132} />
        <Arrow x1={470} y1={110} x2={567} y2={82} label="failure" />
        <Arrow x1={470} y1={155} x2={567} y2={201} label="too many" />
        <Arrow x1={742} y1={82} x2={840} y2={115} label="retry" dashed />
        <Arrow x1={742} y1={202} x2={840} y2={150} label="replay" dashed />
      </svg>
    </div>
  );
}
