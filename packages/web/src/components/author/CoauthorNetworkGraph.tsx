"use client";

import { useEffect, useRef } from "react";
import type { CoauthorInfo } from "@paper-tools/core";

interface CoauthorNetworkGraphProps {
  authorId: string;
  authorName: string;
  coauthors: CoauthorInfo[];
}

export default function CoauthorNetworkGraph({
  authorId,
  authorName,
  coauthors,
}: CoauthorNetworkGraphProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    let cy: import("cytoscape").Core | null = null;

    const run = async () => {
      if (!ref.current) return;
      const cytoscape = (await import("cytoscape")).default;
      if (!mounted || !ref.current) return;

      const nodes = [
        {
          data: {
            id: authorId,
            label: authorName,
            weight: Math.max(8, Math.min(24, coauthors.length / 2 + 8)),
            kind: "self",
          },
        },
        ...coauthors.slice(0, 40).map((c) => ({
          data: {
            id: c.authorId,
            label: c.name,
            weight: Math.max(8, Math.min(20, c.paperCount + 6)),
            kind: "coauthor",
            paperCount: c.paperCount,
          },
        })),
      ];

      const edges = coauthors.slice(0, 40).map((c, idx) => ({
        data: {
          id: `e-${idx}`,
          source: authorId,
          target: c.authorId,
          width: Math.max(1, Math.min(8, c.paperCount)),
        },
      }));

      cy = cytoscape({
        container: ref.current,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "font-size": "10px",
              "text-wrap": "wrap",
              "text-max-width": "110px",
              width: "data(weight)",
              height: "data(weight)",
              "background-color": "#93c5fd",
              color: "#1f2937",
              "text-valign": "bottom",
              "text-margin-y": 6,
            },
          },
          {
            selector: "node[kind = 'self']",
            style: {
              "background-color": "#2563eb",
              color: "#111827",
              "font-weight": 700,
            },
          },
          {
            selector: "edge",
            style: {
              width: "data(width)",
              "line-color": "#60a5fa",
              opacity: 0.65,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          nodeRepulsion: () => 50000,
          idealEdgeLength: () => 140,
          padding: 25,
        },
      });
    };

    void run();

    return () => {
      mounted = false;
      if (cy) {
        cy.destroy();
      }
    };
  }, [authorId, authorName, coauthors]);

  if (coauthors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-text-muted)]">
        共著ネットワークのデータがありません。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div ref={ref} className="h-[360px] w-full" />
    </div>
  );
}
