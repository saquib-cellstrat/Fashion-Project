const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/editor/canvas/EditorCanvas.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Add imports
code = code.replace(
  /import \{ computeCorrespondenceOverlay \} from "@/lib\/image\/hair-correspondence-fit";/,
  `import { computeCorrespondenceOverlay } from "@/lib/image/hair-correspondence-fit";\nimport { MLSWarpCanvas } from "./MLSWarpCanvas";\nimport { type Point2 } from "@/lib/image/mlsWarp";\nimport { SEMANTIC_LANDMARK_INDICES, type SemanticLandmarkId } from "@/lib/image/face-landmarks";`
);

// 2. Add state
code = code.replace(
  /const \[showHairLandmarks, setShowHairLandmarks\] = useState\(false\);/,
  `const [showHairLandmarks, setShowHairLandmarks] = useState(false);\n  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);`
);

// 3. Clear warped canvas on hairstyle change
code = code.replace(
  /setManualTransform\(null\);\n      setOverlayOpacity\(1\);/g,
  `setManualTransform(null);\n      setOverlayOpacity(1);\n      setWarpedCanvas(null);`
);

// 4. Update createTintedHairMask signature
code = code.replace(
  /function createTintedHairMask\(image: HTMLImageElement, hex: string\) \{/,
  `function createTintedHairMask(image: HTMLImageElement | HTMLCanvasElement, hex: string) {`
);

// 5. Replace useCorrespondenceFit logic and add MLS logic
const mlsLogic = `
  const mlsPoints = useMemo(() => {
    if (!hairstyle?.calibrationPoints || !baseLandmarks?.length || !imgProps || !activeOverlayImage) return null;
    
    const src: Point2[] = [];
    const dst: Point2[] = [];

    const hairNaturalW = activeOverlayImage.naturalWidth || activeOverlayImage.width;
    const hairNaturalH = activeOverlayImage.naturalHeight || activeOverlayImage.height;

    for (const id of Object.keys(SEMANTIC_LANDMARK_INDICES) as SemanticLandmarkId[]) {
      const pt = hairstyle.calibrationPoints[id as SemanticLandmarkId];
      if (!pt) continue;
      const idx = SEMANTIC_LANDMARK_INDICES[id as SemanticLandmarkId];
      const lm = baseLandmarks[idx];
      if (!lm) continue;

      src.push({
        x: pt.x * hairNaturalW,
        y: pt.y * hairNaturalH,
      });

      dst.push({
        x: imgProps.x + lm.x * imgProps.width,
        y: imgProps.y + lm.y * imgProps.height,
      });
    }

    if (src.length < 2) return null;

    return { src, dst };
  }, [hairstyle?.calibrationPoints, baseLandmarks, imgProps, activeOverlayImage]);

  const useMlsFit = mlsPoints != null;
  const isMlsReady = useMlsFit && warpedCanvas != null;

  const tintedOverlayImage = useMemo(() => {
    const img = isMlsReady ? warpedCanvas : overlayImage;
    if (!img || !selectedColorHex) return null;
    return createTintedHairMask(img, selectedColorHex);
  }, [isMlsReady, warpedCanvas, overlayImage, selectedColorHex]);
`;

code = code.replace(
  /const tintedOverlayImage = useMemo\(\(\) => \{[\s\S]*?\}, \[overlayImage, selectedColorHex\]\);/,
  "" // We removed the old tintedOverlayImage
);

code = code.replace(
  /const useCorrespondenceFit = correspondenceTransform != null;/,
  mlsLogic
);

// 6. Update baseTransform
code = code.replace(
  /const baseTransform = useMemo\(\(\) => \{[\s\S]*?return autoFitTransform;\n  \}, \[correspondenceTransform, autoFitTransform\]\);/,
  `const baseTransform = useMemo(() => {
    if (useMlsFit) {
      return { x: 0, y: 0, scale: 1, rotation: 0 };
    }
    return autoFitTransform;
  }, [useMlsFit, autoFitTransform]);`
);

// 7. Update overlayWidth and overlayHeight to not crash
code = code.replace(
  /const overlayWidth = referenceWidth \* activeScale;\n  const overlayHeight = overlayWidth \* hairRatio \* \(useCorrespondenceFit \? 1 : heightStretch\);/,
  `const overlayWidth = referenceWidth * activeScale;\n  const overlayHeight = overlayWidth * hairRatio * (useMlsFit ? 1 : heightStretch);`
);

// 8. Update Render mapping
const renderReplacement = `
  const currentDrawImage = isMlsReady ? warpedCanvas : activeOverlayImage;
  const currentDrawWidth = isMlsReady ? dimensions.width : overlayWidth;
  const currentDrawHeight = isMlsReady ? dimensions.height : overlayHeight;
  const currentOffsetX = isMlsReady ? baseCenterX : overlayWidth / 2;
  const currentOffsetY = isMlsReady ? baseCenterY : overlayHeight / 2;
  const currentScaleX = isMlsReady ? activeScale : 1;
  const currentScaleY = isMlsReady ? activeScale : 1;
`;

code = code.replace(
  /const isManualAdjust = manualTransform != null;/,
  `const isManualAdjust = manualTransform != null;\n\n${renderReplacement}`
);

// 9. Update JSX KonvaImages
code = code.replace(
  /<KonvaImage\s+image=\{activeOverlayImage\}[\s\S]*?onDragMove=\{[\s\S]*?\}\s+\/>/,
  `<KonvaImage
                  image={currentDrawImage!}
                  x={baseCenterX + activeOffsetX}
                  y={baseCenterY + activeOffsetY}
                  width={currentDrawWidth}
                  height={currentDrawHeight}
                  offsetX={currentOffsetX}
                  offsetY={currentOffsetY}
                  scaleX={currentScaleX}
                  scaleY={currentScaleY}
                  rotation={activeRotation}
                  opacity={overlayOpacity}
                  draggable
                  onWheel={handleOverlayWheel}
                  onDragMove={(event) => {
                    const node = event.target;
                    setManualTransform({
                      x: node.x() - baseCenterX,
                      y: node.y() - baseCenterY,
                      scale: activeScale,
                      rotation: activeRotation
                    });
                  }}
                />`
);

code = code.replace(
  /\{tintedOverlayImage && \([\s\S]*?<KonvaImage\s+image=\{tintedOverlayImage\}[\s\S]*?listening=\{false\}\s+\/>\s+\)\}/,
  `{tintedOverlayImage && (
                  <KonvaImage
                    image={tintedOverlayImage}
                    x={baseCenterX + activeOffsetX}
                    y={baseCenterY + activeOffsetY}
                    width={currentDrawWidth}
                    height={currentDrawHeight}
                    offsetX={currentOffsetX}
                    offsetY={currentOffsetY}
                    scaleX={currentScaleX}
                    scaleY={currentScaleY}
                    rotation={activeRotation}
                    opacity={0.42}
                    listening={false}
                  />
                )}`
);

// 10. Update the DOM element
code = code.replace(
  /\{activeOverlayImage && imgProps && \(/,
  `{activeOverlayImage && imgProps && (`
);

// Insert the MLSWarpCanvas just before the stage or right after the absolute container
code = code.replace(
  /<div ref=\{containerRef\} className="absolute inset-0">/,
  `{useMlsFit && activeOverlayImage && mlsPoints && (
        <MLSWarpCanvas
          image={activeOverlayImage}
          srcPoints={mlsPoints.src}
          dstPoints={mlsPoints.dst}
          outputWidth={dimensions.width}
          outputHeight={dimensions.height}
          warpType="similarity"
          onCanvasReady={setWarpedCanvas}
        />
      )}\n      <div ref={containerRef} className="absolute inset-0">`
);

// 11. Replace references to useCorrespondenceFit in UI badges
code = code.replace(/useCorrespondenceFit/g, "useMlsFit");

// 12. Fix "autoFitTransform || correspondenceTransform" to "autoFitTransform || useMlsFit"
code = code.replace(/autoFitTransform || correspondenceTransform/g, "autoFitTransform || useMlsFit");

fs.writeFileSync(file, code);
