import React from 'react';

const DIAGRAMS = {
  motivating: {
    src: '/diagrams/kafka-motivating.svg',
    alt: 'Kafka motivating example showing producers, partitions, and consumers',
  },
  architecture: {
    src: '/diagrams/kafka-architecture.svg',
    alt: 'Kafka architecture showing producers, brokers, partitions, and consumer groups',
  },
  partitions: {
    src: '/diagrams/kafka-partitions.svg',
    alt: 'Kafka partitions showing ordering and parallelism',
  },
  'consumer-group': {
    src: '/diagrams/kafka-consumer-groups.svg',
    alt: 'Kafka consumer group distributing partitions across consumers',
  },
  replication: {
    src: '/diagrams/kafka-replication.svg',
    alt: 'Kafka replication showing a leader and follower replicas',
  },
  retry: {
    src: '/diagrams/kafka-retry.svg',
    alt: 'Kafka retry and dead-letter flow for failed consumers',
  },
};

export default function ExcalidrawDiagram({ type, height = 380 }) {
  const diagram = DIAGRAMS[type];
  if (!diagram) return null;

  return (
    <div className="diagram-static-frame" style={{ minHeight: height }}>
      <img
        className="diagram-static-image"
        src={diagram.src}
        alt={diagram.alt}
        loading="lazy"
        draggable="false"
      />
    </div>
  );
}

export function KafkaMotivatingDiagram() {
  return <ExcalidrawDiagram type="motivating" height={360} />;
}

export function KafkaArchitectureDiagram() {
  return <ExcalidrawDiagram type="architecture" height={420} />;
}

export function KafkaPartitionDiagram() {
  return <ExcalidrawDiagram type="partitions" height={370} />;
}

export function KafkaConsumerGroupDiagram() {
  return <ExcalidrawDiagram type="consumer-group" height={380} />;
}

export function KafkaReplicationDiagram() {
  return <ExcalidrawDiagram type="replication" height={330} />;
}

export function KafkaRetryDiagram() {
  return <ExcalidrawDiagram type="retry" height={350} />;
}
