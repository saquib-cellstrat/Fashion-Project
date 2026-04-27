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
  const [showFaceLandmarks, setShowFaceLandmarks] = useState(false);
  const [showHairLandmarks, setShowHairLandmarks] = useState(false);
  const [showFaceContourDebug, setShowFaceContourDebug] = useState(false);
  const [showHairContourDebug, setShowHairContourDebug] = useState(false);
  const [isDebugSidebarCollapsed, setIsDebugSidebarCollapsed] = useState(false);
  const [legacyOverlayControls, setLegacyOverlayControls] = useState<{
    decreaseOpacity: () => void;
    increaseOpacity: () => void;
    resetOverlay: () => void;
  } | null>(null);
  const [mlsOverlayControls, setMlsOverlayControls] = useState<{
    decreaseOpacity: () => void;
    increaseOpacity: () => void;
    resetOverlay: () => void;
  } | null>(null);
  const [exportEditorImage, setExportEditorImage] = useState<(() => void) | null>(null);
  const handleExportReady = useCallback((exportFn: (() => void) | null) => {
    setExportEditorImage((prev) => (prev === exportFn ? prev : exportFn));
  }, []);
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
              templateOval36: cal.templateOval36,
              templateHeadCap: cal.templateHeadCap,
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
  const hasHairCalibrationPoints = !!selectedHairstyle?.calibrationPoints && Object.keys(selectedHairstyle.calibrationPoints).length > 0;
  const hasTemplateContour = !!selectedVariation;

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
          templateOval36: keys.length ? h.templateOval36 : undefined,
          templateHeadCap: keys.length ? h.templateHeadCap : undefined,
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
          templateOval36: row.templateOval36,
          templateHeadCap: row.templateHeadCap,
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
              templateOval36: undefined,
              templateHeadCap: undefined,
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
            templateOval36: processed.templateOval36,
            templateHeadCap: processed.templateHeadCap,
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
          templateOval36: row.templateOval36,
          templateHeadCap: row.templateHeadCap,
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
                  templateOval36: processed.templateOval36,
                  templateHeadCap: processed.templateHeadCap,
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
              templateOval36: processed.templateOval36,
              templateHeadCap: processed.templateHeadCap,
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
          <div className="flex flex-1 gap-6 min-h-0">
            <EditorCanvas
              hairstyle={selectedHairstyle}
              selectedVariation={tryOnEnabled ? selectedVariation : null}
              selectedColorHex={selectedColor?.hex ?? null}
              sourceProfileImageUrl={sourceProfile?.imageDataUrl ?? null}
              showFaceLandmarks={showFaceLandmarks}
              showHairLandmarks={showHairLandmarks}
              showFaceContourDebug={showFaceContourDebug}
              showHairContourDebug={showHairContourDebug}
              onOverlayControlsReady={setLegacyOverlayControls}
              fitEngine="affine"
              title="Legacy (Affine)"
            />
            <EditorCanvas
              hairstyle={selectedHairstyle}
              selectedVariation={tryOnEnabled ? selectedVariation : null}
              selectedColorHex={selectedColor?.hex ?? null}
              sourceProfileImageUrl={sourceProfile?.imageDataUrl ?? null}
              showFaceLandmarks={showFaceLandmarks}
              showHairLandmarks={showHairLandmarks}
              showFaceContourDebug={showFaceContourDebug}
              showHairContourDebug={showHairContourDebug}
              onOverlayControlsReady={setMlsOverlayControls}
              onExportReady={handleExportReady}
              fitEngine="mls"
              title="Current (MLS Warp)"
            />
          </div>

          <EditorVariationTray
            variations={currentVariations}
            selectedVariationId={selectedVariationId}
            onSelectVariation={(variationId) => {
              setTryOnEnabled(true);
              setSelectedVariationId(variationId);
            }}
          />

        </main>
        <aside
          className={`shrink-0 border-l border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
            isDebugSidebarCollapsed ? "w-12" : "w-72"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-2 py-2 dark:border-slate-800">
              {!isDebugSidebarCollapsed && (
                <h3 className="pl-2 text-sm font-bold text-slate-800 dark:text-slate-100">Canvas Controls</h3>
              )}
              <button
                type="button"
                onClick={() => setIsDebugSidebarCollapsed((v) => !v)}
                className="ml-auto flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={isDebugSidebarCollapsed ? "Expand controls sidebar" : "Collapse controls sidebar"}
              >
                <span className="material-symbols-outlined text-lg">
                  {isDebugSidebarCollapsed ? "chevron_left" : "chevron_right"}
                </span>
              </button>
            </div>
            {!isDebugSidebarCollapsed && (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Shared controls for both photo canvases.</p>
                <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  Face landmarks
                  <input
                    type="checkbox"
                    checked={showFaceLandmarks}
                    onChange={(e) => setShowFaceLandmarks(e.target.checked)}
                    className="h-4 w-4 accent-violet-600"
                  />
                </label>
                <label
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium ${
                    hasHairCalibrationPoints
                      ? "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      : "border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500"
                  }`}
                >
                  Hair landmarks
                  <input
                    type="checkbox"
                    checked={showHairLandmarks}
                    disabled={!hasHairCalibrationPoints}
                    onChange={(e) => setShowHairLandmarks(e.target.checked)}
                    className="h-4 w-4 accent-indigo-600 disabled:opacity-50"
                  />
                </label>
                <label
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium ${
                    hasTemplateContour
                      ? "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      : "border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500"
                  }`}
                >
                  36-point face landmarks
                  <input
                    type="checkbox"
                    checked={showFaceContourDebug}
                    onChange={(e) => setShowFaceContourDebug(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600 disabled:opacity-50"
                  />
                </label>
                <label
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium ${
                    hasTemplateContour
                      ? "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      : "border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500"
                  }`}
                >
                  36-point hair landmarks
                  <input
                    type="checkbox"
                    checked={showHairContourDebug}
                    disabled={!hasTemplateContour}
                    onChange={(e) => setShowHairContourDebug(e.target.checked)}
                    className="h-4 w-4 accent-pink-600 disabled:opacity-50"
                  />
                </label>

                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Legacy (Affine)</h4>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => legacyOverlayControls?.decreaseOpacity()}
                      disabled={!legacyOverlayControls}
                      className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Opacity -
                    </button>
                    <button
                      type="button"
                      onClick={() => legacyOverlayControls?.increaseOpacity()}
                      disabled={!legacyOverlayControls}
                      className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Opacity +
                    </button>
                    <button
                      type="button"
                      onClick={() => legacyOverlayControls?.resetOverlay()}
                      disabled={!legacyOverlayControls}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Current (MLS Warp)</h4>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => mlsOverlayControls?.decreaseOpacity()}
                      disabled={!mlsOverlayControls}
                      className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Opacity -
                    </button>
                    <button
                      type="button"
                      onClick={() => mlsOverlayControls?.increaseOpacity()}
                      disabled={!mlsOverlayControls}
                      className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Opacity +
                    </button>
                    <button
                      type="button"
                      onClick={() => mlsOverlayControls?.resetOverlay()}
                      disabled={!mlsOverlayControls}
                      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

