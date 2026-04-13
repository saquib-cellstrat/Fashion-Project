"use client";

import { Circle, Group, Text } from "react-konva";
import {
  SEMANTIC_LANDMARK_INDICES,
  type NormalizedLandmark,
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
  landmarks: NormalizedLandmark[] | null;
  imgProps: { x: number; y: number; width: number; height: number };
};

export function FaceLandmarkDots({ landmarks, imgProps }: Props) {
  if (!landmarks?.length) return null;

  const ids = Object.keys(SEMANTIC_LANDMARK_INDICES) as SemanticLandmarkId[];

  return (
    <>
      {ids.map((id) => {
        const idx = SEMANTIC_LANDMARK_INDICES[id];
        const lm = landmarks[idx];
        if (!lm) return null;
        const x = imgProps.x + lm.x * imgProps.width;
        const y = imgProps.y + lm.y * imgProps.height;
        return (
          <Group key={id}>
            <Circle
              x={x}
              y={y}
              radius={5}
              fill="rgba(59,130,246,0.85)"
              stroke="white"
              strokeWidth={2}
              listening={false}
            />
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
          </Group>
        );
      })}
    </>
  );
}
