"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useCallback } from "react";
import type {
  EditorSourceProfile,
  EditorToolId,
  HairAnchor,
  HairCalibrationPoints,
  HairstyleTemplate,
  Variation,
} from "@/types/editor";
import {
  colorSwatches,
} from "@/features/editor/mock-editor-data";
import { EditorTopBar } from "@/components/editor/top-bar/EditorTopBar";
import { EditorIconToolbar } from "@/components/editor/left-sidebar/EditorIconToolbar";
import { EditorLeftPanel } from "@/components/editor/left-sidebar/EditorLeftPanel";
import { EditorCanvas } from "@/components/editor/canvas/EditorCanvas";
import { EditorVariationTray } from "@/components/editor/bottom-tray/EditorVariationTray";
import { EditorRightSidebar } from "@/components/editor/right-sidebar/EditorRightSidebar";
import { getEditorSourceProfileFromDraft } from "@/lib/storage/onboarding-draft";
import { routes } from "@/config/routes";
import {
  DEFAULT_HAIR_ANCHOR,
  getDefaultAnchorForHairId,
  getHairAnchorForTemplateId,
  normalizeHairAnchor,
} from "@/config/hair-anchors";
import {
  readHairAnchorOverrides,
  removeHairAnchorOverrideForId,
  writeHairAnchorOverrides,
} from "@/lib/storage/hair-anchor-overrides";
import {
  readHairCalibrationOverrides,
  removeHairCalibrationOverrideForId,
  writeHairCalibrationOverrides,
  type HairCalibrationOverride,
} from "@/lib/storage/hair-calibration-overrides";
import {
  preprocessUploadedHairTemplateFromDataUrl,
  preprocessUploadedHairTemplateWithFallback,
  type HairDetachMode,
} from "@/lib/image/hair-template-preprocess";

const prebuiltHairstyles: HairstyleTemplate[] = Array.from({ length: 10 }, (_, i) => {
  const id = `hair-${i + 1}`;
  return {
    id,
    name: `Hair ${i + 1}`,
    imageUrl: `/hair/hair${i + 1}.png`,
    tags: ["Template"],
    category: "Short",
    anchor: getHairAnchorForTemplateId(id),
  };
});

export default function EditorPage() {
  const [activeTool, setActiveTool] = useState<EditorToolId>("style");
  const [uploadedHairstyles, setUploadedHairstyles] = useState<HairstyleTemplate[]>(prebuiltHairstyles);
  const [selectedHairstyleId, setSelectedHairstyleId] = useState(prebuiltHairstyles[0]?.id ?? "");
  const [selectedVariationId, setSelectedVariationId] = useState(
    prebuiltHairstyles[0] ? `${prebuiltHairstyles[0].id}-base` : ""
  );
  const [selectedColorId, setSelectedColorId] = useState("");
  const [tryOnEnabled, setTryOnEnabled] = useState(false);
  const [isProcessingUploads, setIsProcessingUploads] = useState(false);
  const [isReprocessingHairstyle, setIsReprocessingHairstyle] = useState(false);
  const [exportEditorImage, setExportEditorImage] = useState<(() => void) | null>(null);
  const handleExportReady = useCallback((exportFn: (() => void) | null) => {
    setExportEditorImage((prev) => (prev === exportFn ? prev : exportFn));
  }, []);

  const [showRightSidebar, setShowRightSidebar] = useState(true);
  /** Read after mount so SSR and first client paint match (avoids localStorage hydration mismatch). */
  const [sourceProfile, setSourceProfile] = useState<EditorSourceProfile | null>(null);
  useEffect(() => {
    queueMicrotask(() => {
      setSourceProfile(getEditorSourceProfileFromDraft());
    });
  }, []);

  useEffect(() => {
    const anchorOverrides = readHairAnchorOverrides();
    const calibrationOverrides = readHairCalibrationOverrides();
    if (
      Object.keys(anchorOverrides).length === 0 &&
      Object.keys(calibrationOverrides).length === 0
    ) {
      return;
    }
    queueMicrotask(() => {
      setUploadedHairstyles((prev) =>
        prev.map((h) => {
          let next: HairstyleTemplate = h;
          const ov = anchorOverrides[h.id];
          if (ov) {
            next = {
              ...next,
              anchor: normalizeHairAnchor({ ...normalizeHairAnchor(next.anchor), ...ov }),
            };
          }
          const cal = calibrationOverrides[h.id];
          if (cal) {
            next = {
              ...next,
              calibrationPoints: cal.points,
              calibrationConfidence: cal.confidence,
              calibrationQuality: cal.quality,
              calibrationWarnings: cal.warnings,
              isAutoCalibrated: cal.isAutoCalibrated,
            };
          }
          return next;
        })
      );
    });
  }, []);

  const selectedHairstyle = useMemo(
    () => uploadedHairstyles.find((h) => h.id === selectedHairstyleId) ?? null,
    [selectedHairstyleId, uploadedHairstyles]
  );

  const currentVariations = useMemo(
    () =>
      selectedHairstyle
        ? [
            {
              id: `${selectedHairstyle.id}-base`,
              label: selectedHairstyle.name,
              thumbnailUrl: selectedHairstyle.imageUrl,
            } satisfies Variation,
          ]
        : [],
    [selectedHairstyle]
  );
  const selectedVariation = useMemo(
    () => currentVariations.find((variation) => variation.id === selectedVariationId) ?? currentVariations[0] ?? null,
    [currentVariations, selectedVariationId]
  );
  const selectedColor = useMemo(
    () => colorSwatches.find((color) => color.id === selectedColorId) ?? null,
    [selectedColorId]
  );

  // When hairstyle changes, reset variation to first available
  const handleSelectHairstyle = (id: string) => {
    setTryOnEnabled(true);
    setSelectedHairstyleId(id);
    const newVariations = uploadedHairstyles
      .filter((style) => style.id === id)
      .map((style) => ({
        id: `${style.id}-base`,
        label: style.name,
        thumbnailUrl: style.imageUrl,
      }));
    if (newVariations?.[0]) {
      setSelectedVariationId(newVariations[0].id);
    }
  };

  const handleHairAnchorChange = useCallback((id: string, patch: Partial<HairAnchor>) => {
    setUploadedHairstyles((prev) => {
      const next = prev.map((h) => {
        if (h.id !== id) return h;
        const anchor = normalizeHairAnchor({ ...normalizeHairAnchor(h.anchor), ...patch });
        return { ...h, anchor };
      });
      const row = next.find((h) => h.id === id);
      if (row?.anchor) {
        const map = readHairAnchorOverrides();
        writeHairAnchorOverrides({ ...map, [id]: row.anchor });
      }
      return next;
    });
  }, []);

  const handleHairAnchorReset = useCallback((id: string) => {
    const defaults = getDefaultAnchorForHairId(id);
    setUploadedHairstyles((prev) =>
      prev.map((h) => (h.id === id ? { ...h, anchor: defaults } : h))
    );
    const map = readHairAnchorOverrides();
    removeHairAnchorOverrideForId(id, map);
  }, []);

  /** Copy the selected hairstyle’s normalized anchor to every hairstyle (same fit tuning for all PNGs). */
  const handleHairAnchorApplyToAll = useCallback((sourceId: string) => {
   setUploadedHairstyles((prev) => {
      const source = prev.find((h) => h.id === sourceId);
      if (!source) return prev;
      const template = normalizeHairAnchor(source.anchor);
      const next = prev.map((h) => ({
        ...h,
        anchor: { ...template },
      }));
      const map = readHairAnchorOverrides();
      const nextMap: Record<string, HairAnchor> = { ...map };
      for (const h of next) {
        nextMap[h.id] = h.anchor!;
      }
      writeHairAnchorOverrides(nextMap);
      return next;
    });
  }, []);

  const handleHairCalibrationChange = useCallback((id: string, calibration: HairCalibrationPoints) => {
    setUploadedHairstyles((prev) => {
      const next = prev.map((h) => {
        if (h.id !== id) return h;
        const keys = Object.keys(calibration);
        return {
          ...h,
          calibrationPoints: keys.length ? calibration : undefined,
          calibrationConfidence: keys.length ? h.calibrationConfidence : undefined,
          calibrationQuality: keys.length ? h.calibrationQuality : undefined,
          calibrationWarnings: keys.length ? h.calibrationWarnings : undefined,
          isAutoCalibrated: false,
        };
      });
      const map = readHairCalibrationOverrides();
      if (Object.keys(calibration).length === 0) {
        removeHairCalibrationOverrideForId(id, map);
      } else {
        const row = next.find((h) => h.id === id);
        if (!row?.calibrationPoints) return next;
        const payload: HairCalibrationOverride = {
          points: row.calibrationPoints,
          confidence: row.calibrationConfidence,
          quality: row.calibrationQuality,
          warnings: row.calibrationWarnings,
          isAutoCalibrated: false,
        };
        writeHairCalibrationOverrides({ ...map, [id]: payload });
      }
      return next;
    });
  }, []);

  const handleHairCalibrationClear = useCallback((id: string) => {
    setUploadedHairstyles((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              calibrationPoints: undefined,
              calibrationConfidence: undefined,
              calibrationQuality: undefined,
              calibrationWarnings: undefined,
              isAutoCalibrated: false,
            }
          : h
      )
    );
    const map = readHairCalibrationOverrides();
    removeHairCalibrationOverrideForId(id, map);
  }, []);

  const handleUploadHairstyles = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsProcessingUploads(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file, index) => {
          const processed = await preprocessUploadedHairTemplateWithFallback(file);
          const baseName = file.name.replace(/\.[^.]+$/, "").trim() || `Hairstyle ${index + 1}`;
          return {
            id: `${Date.now()}-${index}-${baseName.toLowerCase().replace(/\s+/g, "-")}`,
            name: baseName,
            imageUrl: processed.imageUrl,
            sourceImageUrl: processed.sourceImageUrl ?? processed.imageUrl,
            tags: ["Uploaded"],
            category: "Short" as const,
            anchor: DEFAULT_HAIR_ANCHOR,
            calibrationPoints: processed.calibrationPoints,
            indexedCalibrationPoints: processed.indexedCalibrationPoints,
            calibrationConfidence: processed.calibrationConfidence,
            calibrationQuality: processed.calibrationQuality,
            calibrationWarnings: processed.calibrationWarnings,
            isAutoCalibrated: processed.isAutoCalibrated,
          };
        })
      );
      setUploadedHairstyles((prev) => {
        const next = [...prev, ...uploaded];
        if (!selectedHairstyleId && next[0]) {
          setSelectedHairstyleId(next[0].id);
          setSelectedVariationId(`${next[0].id}-base`);
        }
        return next;
      });

      const calibrationMap = readHairCalibrationOverrides();
      const merged: Record<string, HairCalibrationOverride> = { ...calibrationMap };
      for (const row of uploaded) {
        if (!row.calibrationPoints) continue;
        merged[row.id] = {
          points: row.calibrationPoints,
          confidence: row.calibrationConfidence,
          quality: row.calibrationQuality,
          warnings: row.calibrationWarnings,
          isAutoCalibrated: row.isAutoCalibrated,
        };
      }
      writeHairCalibrationOverrides(merged);
    } finally {
      setIsProcessingUploads(false);
    }
  };

  const handleReprocessHairstyle = useCallback(
    async (id: string, mode: HairDetachMode) => {
      const target = uploadedHairstyles.find((h) => h.id === id);
      if (!target) return;
      const sourceUrl = target.sourceImageUrl ?? target.imageUrl;
      setIsReprocessingHairstyle(true);
      try {
        const processed = await preprocessUploadedHairTemplateFromDataUrl(sourceUrl, mode);
        setUploadedHairstyles((prev) =>
          prev.map((h) =>
            h.id === id
              ? {
                  ...h,
                  imageUrl: processed.imageUrl,
                  sourceImageUrl: sourceUrl,
                  calibrationPoints: processed.calibrationPoints,
                  indexedCalibrationPoints: processed.indexedCalibrationPoints,
                  calibrationConfidence: processed.calibrationConfidence,
                  calibrationQuality: processed.calibrationQuality,
                  calibrationWarnings: processed.calibrationWarnings,
                  isAutoCalibrated: processed.isAutoCalibrated,
                }
              : h
          )
        );

        const map = readHairCalibrationOverrides();
        if (processed.calibrationPoints) {
          writeHairCalibrationOverrides({
            ...map,
            [id]: {
              points: processed.calibrationPoints,
              confidence: processed.calibrationConfidence,
              quality: processed.calibrationQuality,
              warnings: processed.calibrationWarnings,
              isAutoCalibrated: processed.isAutoCalibrated,
            },
          });
        }
      } finally {
        setIsReprocessingHairstyle(false);
      }
    },
    [uploadedHairstyles]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <EditorTopBar onSave={() => exportEditorImage?.()} canSave={!!exportEditorImage} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left side: icon toolbar + expandable panel */}
        <div className="flex shrink-0">
          <EditorIconToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
          />
          <EditorLeftPanel
            activeTool={activeTool}
            hairstyles={uploadedHairstyles}
            selectedHairstyleImageUrl={selectedHairstyle?.imageUrl ?? null}
            selectedHairstyleId={selectedHairstyleId}
            selectedColorId={selectedColorId}
            onSelectHairstyle={handleSelectHairstyle}
            onUploadHairstyles={handleUploadHairstyles}
            onSelectColor={setSelectedColorId}
            onHairAnchorChange={handleHairAnchorChange}
            onHairAnchorReset={handleHairAnchorReset}
            onHairAnchorApplyToAll={handleHairAnchorApplyToAll}
            onHairCalibrationChange={handleHairCalibrationChange}
            onHairCalibrationClear={handleHairCalibrationClear}
            isProcessingUploads={isProcessingUploads}
            isReprocessingHairstyle={isReprocessingHairstyle}
            onReprocessHairstyle={handleReprocessHairstyle}
          />
        </div>

        {/* Main content: canvas + variation tray */}
        <main className="relative flex flex-1 flex-col overflow-hidden p-6 gap-6">
          {!sourceProfile && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              No saved onboarding photo found. Add your photo first to use it as the base image in editor.{" "}
              <Link href={routes.onboardingPhoto} className="font-semibold underline underline-offset-2">
                Setup photo
              </Link>
            </div>
          )}
          <EditorCanvas
            hairstyle={selectedHairstyle}
            selectedVariation={tryOnEnabled ? selectedVariation : null}
            selectedColorHex={selectedColor?.hex ?? null}
            sourceProfileImageUrl={sourceProfile?.imageDataUrl ?? null}
            onExportReady={handleExportReady}
          />

          <EditorVariationTray
            variations={currentVariations}
            selectedVariationId={selectedVariationId}
            onSelectVariation={(variationId) => {
              setTryOnEnabled(true);
              setSelectedVariationId(variationId);
            }}
          />

          {/* Re-open button when right sidebar is collapsed */}
          {!showRightSidebar && (
            <button
              type="button"
              onClick={() => setShowRightSidebar(true)}
              className="absolute top-6 right-6 z-10 flex size-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors dark:bg-slate-900 dark:border-slate-800"
              aria-label="Open sidebar"
            >
              <span className="material-symbols-outlined text-xl">left_panel_open</span>
            </button>
          )}
        </main>

        {/* Right sidebar: trending & challenges */}
        {showRightSidebar && (
          <EditorRightSidebar onClose={() => setShowRightSidebar(false)} />
        )}
      </div>
    </div>
  );
}

