"use client";

import { Shape } from "react-konva";
import type Konva from "konva";
import type { CorrespondenceWarpedMesh } from "@/lib/image/hair-correspondence-fit";

type Props = {
  image: HTMLImageElement | HTMLCanvasElement;
  mesh: CorrespondenceWarpedMesh;
  opacity?: number;
  listening?: boolean;
  draggable?: boolean;
  x?: number;
  y?: number;
  onWheel?: (event: Konva.KonvaEventObject<WheelEvent>) => void;
  onDragMove?: (event: Konva.KonvaEventObject<DragEvent>) => void;
};

type Point2 = { x: number; y: number };
const TRIANGLE_OVERDRAW_PX = 0.7;

function computeAffineFromTriangles(src: [Point2, Point2, Point2], dst: [Point2, Point2, Point2]) {
  const [s1, s2, s3] = src;
  const [d1, d2, d3] = dst;

  const denom = s1.x * (s2.y - s3.y) + s2.x * (s3.y - s1.y) + s3.x * (s1.y - s2.y);
  if (Math.abs(denom) < 1e-8) return null;

  const a =
    (d1.x * (s2.y - s3.y) + d2.x * (s3.y - s1.y) + d3.x * (s1.y - s2.y)) / denom;
  const c =
    (d1.x * (s3.x - s2.x) + d2.x * (s1.x - s3.x) + d3.x * (s2.x - s1.x)) / denom;
  const e =
    (d1.x * (s2.x * s3.y - s3.x * s2.y) +
      d2.x * (s3.x * s1.y - s1.x * s3.y) +
      d3.x * (s1.x * s2.y - s2.x * s1.y)) /
    denom;

  const b =
    (d1.y * (s2.y - s3.y) + d2.y * (s3.y - s1.y) + d3.y * (s1.y - s2.y)) / denom;
  const d =
    (d1.y * (s3.x - s2.x) + d2.y * (s1.x - s3.x) + d3.y * (s2.x - s1.x)) / denom;
  const f =
    (d1.y * (s2.x * s3.y - s3.x * s2.y) +
      d2.y * (s3.x * s1.y - s1.x * s3.y) +
      d3.y * (s1.x * s2.y - s2.x * s1.y)) /
    denom;

  return { a, b, c, d, e, f };
}

function expandTriangle(points: [Point2, Point2, Point2], amount: number): [Point2, Point2, Point2] {
  if (amount <= 0) return points;
  const cx = (points[0].x + points[1].x + points[2].x) / 3;
  const cy = (points[0].y + points[1].y + points[2].y) / 3;
  return points.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return p;
    const scale = (len + amount) / len;
    return { x: cx + dx * scale, y: cy + dy * scale };
  }) as [Point2, Point2, Point2];
}

export function WarpedMesh({
  image,
  mesh,
  opacity = 1,
  listening = true,
  draggable = false,
  x = 0,
  y = 0,
  onWheel,
  onDragMove,
}: Props) {
  const imageWidth = image instanceof HTMLImageElement ? image.naturalWidth || image.width : image.width;
  const imageHeight = image instanceof HTMLImageElement ? image.naturalHeight || image.height : image.height;

  return (
    <Shape
      x={x}
      y={y}
      opacity={opacity}
      listening={listening}
      draggable={draggable}
      onWheel={onWheel}
      onDragMove={onDragMove}
      perfectDrawEnabled={false}
      hitFunc={(ctx, shape) => {
        const { minX, minY, maxX, maxY } = mesh.bounds;
        ctx.beginPath();
        ctx.rect(minX, minY, maxX - minX, maxY - minY);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
      sceneFunc={(ctx, shape) => {
        for (const tri of mesh.triangles) {
          const v0 = mesh.vertices[tri.a];
          const v1 = mesh.vertices[tri.b];
          const v2 = mesh.vertices[tri.c];
          if (!v0 || !v1 || !v2) continue;

          const src: [Point2, Point2, Point2] = [
            { x: v0.sx + imageWidth / 2, y: v0.sy + imageHeight / 2 },
            { x: v1.sx + imageWidth / 2, y: v1.sy + imageHeight / 2 },
            { x: v2.sx + imageWidth / 2, y: v2.sy + imageHeight / 2 },
          ];
          const dst: [Point2, Point2, Point2] = [
            { x: v0.dx, y: v0.dy },
            { x: v1.dx, y: v1.dy },
            { x: v2.dx, y: v2.dy },
          ];
          const matrix = computeAffineFromTriangles(src, dst);
          if (!matrix) continue;

          ctx.save();
          const expanded = expandTriangle(dst, TRIANGLE_OVERDRAW_PX);

          ctx.beginPath();
          ctx.moveTo(expanded[0].x, expanded[0].y);
          ctx.lineTo(expanded[1].x, expanded[1].y);
          ctx.lineTo(expanded[2].x, expanded[2].y);
          ctx.closePath();
          ctx.clip();

          ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
          ctx.drawImage(image, 0, 0, imageWidth, imageHeight);
          ctx.restore();
        }

        ctx.fillStrokeShape(shape);
      }}
    />
  );
}
