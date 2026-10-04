import React, { useEffect, useMemo, useState } from 'react';
import {
  Excalidraw,
  convertToExcalidrawElements,
} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const COLORS = {
  stroke: '#c6c3d1',
  accent: '#b99af7',
  text: '#f1eff8',
  muted: '#a8aab6',
  fill: '#171922',
  accentFill: '#211b30',
};

const box = (x, y, width, height, text, options = {}) => ({
  type: options.shape || 'rectangle',
  x,
  y,
  width,
  height,
  strokeColor: options.strokeColor || COLORS.stroke,
  backgroundColor: options.backgroundColor || COLORS.fill,
  strokeWidth: 2,
  roughness: 1,
  label: {
    text,
    fontSize: options.fontSize || 18,
    strokeColor: options.textColor || COLORS.text,
  },
});

const arrow = (x, y, dx, dy, label = '') => ({
  type: 'arrow',
  x,
  y,
  points: [[0, 0], [dx, dy]],
  strokeColor: COLORS.accent,
  strokeWidth: 2,
  roughness: 1,
  endArrowhead: 'arrow',
  ...(label ? { label: { text: label, fontSize: 14, strokeColor: COLORS.muted } } : {}),
});

const text = (x, y, value, fontSize = 18, color = COLORS.muted) => ({
  type: 'text',
  x,
  y,
  text: value,
  fontSize,
  strokeColor: color,
  roughness: 1,
});

function motivatingScene() {
  return [
    box(40, 120, 190, 120, 'Event producers\nservices emitting events'),
    box(365, 65, 205, 82, 'Partition 0\nordered log', { backgroundColor: COLORS.accentFill, strokeColor: COLORS.accent }),
    box(365, 180, 205, 82, 'Partition 1\nordered log'),
    box(695, 120, 190, 120, 'Consumers\nscoreboard / analytics'),
    arrow(230, 175, 130, -65, 'publish'),
    arrow(230, 175, 130, 45),
    arrow(570, 106, 120, 55, 'poll'),
    arrow(570, 220, 120, -30),
    text(38, 280, 'Same event stream → independently scalable consumers', 16),
  ];
}

function architectureScene() {
  return [
    box(30, 135, 165, 90, 'Producers'),
    box(280, 55, 430, 285, 'Kafka cluster', { backgroundColor: '#10121a' }),
    box(315, 105, 165, 90, 'Broker 1\nP0 leader\nP2 follower', { backgroundColor: COLORS.accentFill, strokeColor: COLORS.accent }),
    box(510, 105, 165, 90, 'Broker 2\nP1 leader\nP0 follower'),
    box(315, 220, 165, 90, 'Broker 3\nP2 leader\nP1 follower'),
    box(510, 220, 165, 90, 'Broker 4\nreplicas'),
    box(795, 135, 165, 90, 'Consumer groups'),
    arrow(195, 180, 80, 20, 'records'),
    arrow(710, 180, 80, 20, 'poll'),
    text(315, 75, 'Brokers store and serve partition data', 15),
  ];
}

function partitionsScene() {
  return [
    box(40, 120, 170, 90, 'Topic: orders', { backgroundColor: COLORS.accentFill, strokeColor: COLORS.accent }),
    box(330, 45, 230, 70, 'Partition 0\nuser-42 · 0 → 1 → 2'),
    box(330, 140, 230, 70, 'Partition 1\nuser-17 · 0 → 1 → 2'),
    box(330, 235, 230, 70, 'Partition 2\nuser-91 · 0 → 1 → 2'),
    arrow(210, 165, 115, -85, 'key'),
    arrow(210, 165, 115, 10),
    arrow(210, 165, 115, 75),
    text(620, 65, 'Ordering', 16, COLORS.text),
    text(620, 88, 'within one partition', 15),
    text(620, 145, 'Parallelism', 16, COLORS.text),
    text(620, 168, 'across partitions', 15),
    text(620, 225, 'Scaling unit', 16, COLORS.text),
    text(620, 248, 'partition count', 15),
  ];
}

function consumerGroupScene() {
  return [
    box(35, 105, 165, 130, 'Topic: orders\nP0\nP1\nP2', { backgroundColor: COLORS.accentFill, strokeColor: COLORS.accent }),
    box(315, 45, 195, 70, 'Consumer A\nassigned P0'),
    box(315, 135, 195, 70, 'Consumer B\nassigned P1'),
    box(315, 225, 195, 70, 'Consumer C\nassigned P2'),
    box(655, 100, 235, 135, 'Group: checkout-workers\nOne active consumer\nper partition'),
    arrow(200, 135, 105, -55),
    arrow(200, 170, 105, 0),
    arrow(200, 205, 105, 55),
    text(655, 255, 'Add consumers up to partition count', 15),
  ];
}

function replicationScene() {
  return [
    box(35, 100, 220, 120, 'Broker 1\nP0 — LEADER\naccepts writes', { backgroundColor: COLORS.accentFill, strokeColor: COLORS.accent }),
    box(350, 100, 220, 120, 'Broker 2\nP0 — FOLLOWER\nreplica'),
    box(665, 100, 220, 120, 'Broker 3\nP0 — FOLLOWER\nreplica'),
    arrow(255, 155, 90, 0, 'replicate'),
    arrow(255, 180, 405, 0, 'replicate'),
    text(35, 265, 'Leader failure → an in-sync follower can become the new leader', 15),
  ];
}

function retryScene() {
  return [
    box(25, 105, 160, 80, 'Main topic\norders', { backgroundColor: COLORS.accentFill, strokeColor: COLORS.accent }),
    box(275, 105, 175, 80, 'Consumer\nprocess'),
    box(550, 40, 185, 80, 'Retry topic\nattempt again'),
    box(550, 185, 185, 80, 'Dead-letter topic\ninspect / replay'),
    box(835, 105, 125, 80, 'Fix + replay'),
    arrow(185, 145, 85, 0),
    arrow(450, 125, 95, -45, 'failure'),
    arrow(450, 165, 95, 55, 'too many'),
    arrow(735, 80, 90, 65, 'retry'),
    arrow(735, 225, 90, -65, 'replay'),
  ];
}

const scenes = {
  motivating: motivatingScene,
  architecture: architectureScene,
  partitions: partitionsScene,
  'consumer-group': consumerGroupScene,
  replication: replicationScene,
  retry: retryScene,
};

export default function ExcalidrawDiagram({ type, height = 380 }) {
  const scene = useMemo(() => scenes[type]?.() || [], [type]);
  const [elements, setElements] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Excalidraw measures text while converting element skeletons.
      // Wait until the browser has loaded its fonts so labels get correct bounds.
      if (document.fonts?.ready) await document.fonts.ready;
      const next = convertToExcalidrawElements(scene);
      if (!cancelled) setElements(next);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [scene]);

  if (!elements) {
    return <div className="excalidraw-loading" style={{ height }} aria-label="Loading diagram" />;
  }

  return (
    <div className="excalidraw-frame" style={{ height }}>
      <Excalidraw
        initialData={{
          elements,
          appState: {
            theme: 'dark',
            viewBackgroundColor: '#0d0f15',
            viewBackgroundColorSource: { type: 'custom' },
            gridModeEnabled: false,
            zenModeEnabled: true,
            viewModeEnabled: true,
            exportWithDarkMode: true,
          },
        }}
        initialState={{
          viewport: {
            target: elements,
            fit: 'scale-down',
            animation: false,
          },
        }}
        theme="dark"
        viewModeEnabled
        interaction={false}
        zenModeEnabled
        ui={false}
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
