"use client";

import { Circle, Group, Text } from "react-konva";
import {
  SEMANTIC_LANDMARK_INDICES,
  type NormalizedLandmark,
  type NormalizedPoint2,
  type SemanticLandmarkId,
} from "@/lib/image/face-landmarks";

const LABELS: Record<SemanticLandmarkId, string> = {
  leftEye: "L eye",
  rightEye: "R eye",
  noseTip: "Nose",
  leftEar: "L ear",
  rightEar: "R ear",
  chin: "Chin",
  forehead: "Forehead",
};

type Props = {
  landmarks?: NormalizedLandmark[] | null;
  points?: NormalizedPoint2[] | null;
  imgProps: { x: number; y: number; width: number; height: number };
  color?: string;
  radius?: number;
  showIndex?: boolean;
  showSemanticLabels?: boolean;
};

export function FaceLandmarkDots({
  landmarks = null,
  points = null,
  imgProps,
  color = "rgba(59,130,246,0.85)",
  radius = 5,
  showIndex = false,
  showSemanticLabels = true,
}: Props) {
  const contourPoints = points?.length ? points : null;
  const semanticLandmarks = landmarks ?? [];
  if (!contourPoints && semanticLandmarks.length === 0) return null;

  const ids = Object.keys(SEMANTIC_LANDMARK_INDICES) as SemanticLandmarkId[];

  if (contourPoints) {
    return (
      <>
        {contourPoints.map((p, index) => {
          const x = imgProps.x + p.x * imgProps.width;
          const y = imgProps.y + p.y * imgProps.height;
          return (
            <Group key={`contour-${index}`}>
              <Circle
                x={x}
                y={y}
                radius={radius}
                fill={color}
                stroke="white"
                strokeWidth={1.2}
                listening={false}
              />
              {showIndex && (
                <Text
                  x={x + 5}
                  y={y - 5}
                  text={String(index + 1)}
                  fontSize={9}
                  fill="white"
                  stroke="rgba(15,23,42,0.75)"
                  strokeWidth={2.2}
                  padding={1}
                  listening={false}
                />
              )}
            </Group>
          );
        })}
      </>
    );
  }

  return (
    <>
      {ids.map((id) => {
        const idx = SEMANTIC_LANDMARK_INDICES[id];
        const lm = semanticLandmarks[idx];
        if (!lm) return null;
        const x = imgProps.x + lm.x * imgProps.width;
        const y = imgProps.y + lm.y * imgProps.height;
        return (
          <Group key={id}>
            <Circle
              x={x}
              y={y}
              radius={radius}
              fill={color}
              stroke="white"
              strokeWidth={2}
              listening={false}
            />
            {showSemanticLabels && (
              <Text
                x={x + 8}
                y={y - 6}
                text={LABELS[id]}
                fontSize={10}
                fill="white"
                stroke="rgba(15,23,42,0.75)"
                strokeWidth={3}
                padding={2}
                listening={false}
              />
            )}
          </Group>
        );
      })}
    </>
  );
}
