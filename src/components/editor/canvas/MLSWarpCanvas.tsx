"use client";

import React, { useRef, useEffect, useState } from "react";
import { computeMLSGrid, type Point2, type MLSWarpType } from "@/lib/image/mlsWarp";
import type { ImageColorStatsPayload } from "@/types/editor";

type Props = {
  image: HTMLImageElement;
  srcPoints: Point2[];
  dstPoints: Point2[];
  outputWidth: number;
  outputHeight: number;
  baseColorStats?: ImageColorStatsPayload | null;
  hairColorStats?: ImageColorStatsPayload | null;
  warpType?: MLSWarpType;
  gridCols?: number;
  gridRows?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

const warpVsSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    // convert the rectangle from pixels to 0.0 to 1.0
    vec2 zeroToOne = a_position / u_resolution;
    // convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;
    // convert from 0->2 to -1->+1 (clipspace)
    vec2 clipSpace = zeroToTwo - 1.0;
    
    // gl_Position requires flip Y
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_texCoord = a_texCoord;
  }
`;

const warpFsSource = `
  precision mediump float;
  uniform sampler2D u_hairTex;
  varying vec2 v_texCoord;

  void main() {
    gl_FragColor = texture2D(u_hairTex, v_texCoord);
  }
`;

const blendVsSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 clipSpace = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const blendFsSource = `
  precision mediump float;
  varying vec2 v_texCoord;
  uniform sampler2D u_warpTex;
  uniform vec2 u_texelSize;
  uniform vec3 u_hairMean;
  uniform vec3 u_hairStd;
  uniform vec3 u_baseMean;
  uniform vec3 u_baseStd;
  uniform float u_colorTransferStrength;
  uniform float u_enableColorTransfer;
  uniform float u_erodePx;
  uniform float u_featherPx;
  uniform float u_aoStrength;

  float safeDiv(float n, float d) {
    return n / max(1e-4, d);
  }

  vec3 safeUnpremultiply(vec4 rgba) {
    if (rgba.a <= 1e-4) return rgba.rgb;
    return rgba.rgb / rgba.a;
  }

  vec2 toWarpUv(vec2 uv) {
    // Warp pass is rendered into an FBO; flip Y when sampling it in screen-space pass.
    return vec2(uv.x, 1.0 - uv.y);
  }

  vec3 applyColorTransfer(vec3 hairRgb) {
    float hairLuma = dot(hairRgb, vec3(0.2126, 0.7152, 0.0722));
    float mappedLuma = ((hairLuma - u_hairMean.g) / max(1e-4, u_hairStd.g)) * u_baseStd.g + u_baseMean.g;
    float lumaScale = clamp(mappedLuma / max(1e-4, hairLuma), 0.6, 1.4);
    vec3 lumaMatched = clamp(hairRgb * lumaScale, 0.0, 1.0);
    return mix(hairRgb, lumaMatched, clamp(u_enableColorTransfer * u_colorTransferStrength, 0.0, 1.0));
  }

  float sampleAlpha(vec2 uv) {
    return texture2D(u_warpTex, toWarpUv(uv)).a;
  }

  float calculateEdgeAlpha(vec2 uv, float baseAlpha) {
    vec2 e = u_texelSize * max(0.0, u_erodePx);
    float eroded = baseAlpha;
    eroded = min(eroded, sampleAlpha(uv + vec2( e.x, 0.0)));
    eroded = min(eroded, sampleAlpha(uv + vec2(-e.x, 0.0)));
    eroded = min(eroded, sampleAlpha(uv + vec2(0.0,  e.y)));
    eroded = min(eroded, sampleAlpha(uv + vec2(0.0, -e.y)));
    eroded = min(eroded, sampleAlpha(uv + vec2( e.x,  e.y)));
    eroded = min(eroded, sampleAlpha(uv + vec2( e.x, -e.y)));
    eroded = min(eroded, sampleAlpha(uv + vec2(-e.x,  e.y)));
    eroded = min(eroded, sampleAlpha(uv + vec2(-e.x, -e.y)));

    vec2 f = u_texelSize * max(0.0, u_featherPx);
    float dilated = baseAlpha;
    dilated = max(dilated, sampleAlpha(uv + vec2( f.x, 0.0)));
    dilated = max(dilated, sampleAlpha(uv + vec2(-f.x, 0.0)));
    dilated = max(dilated, sampleAlpha(uv + vec2(0.0,  f.y)));
    dilated = max(dilated, sampleAlpha(uv + vec2(0.0, -f.y)));
    dilated = max(dilated, sampleAlpha(uv + vec2( f.x,  f.y)));
    dilated = max(dilated, sampleAlpha(uv + vec2( f.x, -f.y)));
    dilated = max(dilated, sampleAlpha(uv + vec2(-f.x,  f.y)));
    dilated = max(dilated, sampleAlpha(uv + vec2(-f.x, -f.y)));

    float edgeBand = clamp(safeDiv(dilated - eroded, max(1e-4, dilated + 0.05)), 0.0, 1.0);
    float inwardFeather = mix(1.0, 0.72, edgeBand);
    return clamp(eroded * inwardFeather, 0.0, 1.0);
  }

  float applyAmbientOcclusion(vec2 uv, float refinedAlpha, float edgeBand) {
    vec2 down = vec2(0.0, 1.0) * u_texelSize;
    float a1 = sampleAlpha(uv + down * 1.0);
    float a2 = sampleAlpha(uv + down * 2.0);
    float a3 = sampleAlpha(uv + down * 3.0);
    float sideL = sampleAlpha(uv + vec2(-down.y, down.x) * 1.5);
    float sideR = sampleAlpha(uv + vec2(down.y, down.x) * 1.5);
    float occluder = (a1 * 0.35 + a2 * 0.25 + a3 * 0.15 + sideL * 0.125 + sideR * 0.125);
    return clamp((1.0 - refinedAlpha) * edgeBand * occluder * u_aoStrength, 0.0, 0.75);
  }

  void main() {
    vec4 warpSample = texture2D(u_warpTex, toWarpUv(v_texCoord));

    vec3 hairStraight = safeUnpremultiply(warpSample);
    float baseAlpha = warpSample.a;
    float refinedAlpha = calculateEdgeAlpha(v_texCoord, baseAlpha);
    float edgeBand = clamp((baseAlpha - refinedAlpha) * 4.0, 0.0, 1.0);

    vec3 transferredHair = applyColorTransfer(hairStraight);
    float shadowAlpha = applyAmbientOcclusion(v_texCoord, refinedAlpha, edgeBand);

    vec3 hairPremul = clamp(transferredHair, 0.0, 1.0) * refinedAlpha;
    float outAlpha = clamp(refinedAlpha + shadowAlpha * (1.0 - refinedAlpha), 0.0, 1.0);
    gl_FragColor = vec4(hairPremul, outAlpha);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function MLSWarpCanvas({
  image,
  srcPoints,
  dstPoints,
  outputWidth,
  outputHeight,
  baseColorStats = null,
  hairColorStats = null,
  warpType = "affine",
  gridCols = 40,
  gridRows = 40,
  onCanvasReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glContext, setGlContext] = useState<WebGLRenderingContext | null>(null);
  const [programInfo, setProgramInfo] = useState<{
    warpProgram: WebGLProgram;
    blendProgram: WebGLProgram;
    warpPositionLocation: number;
    warpTexCoordLocation: number;
    warpResolutionLocation: WebGLUniformLocation;
    hairSamplerLocation: WebGLUniformLocation;
    blendPositionLocation: number;
    blendTexCoordLocation: number;
    blendResolutionLocation: WebGLUniformLocation;
    warpSamplerLocation: WebGLUniformLocation;
    texelSizeLocation: WebGLUniformLocation;
    hairMeanLocation: WebGLUniformLocation;
    hairStdLocation: WebGLUniformLocation;
    baseMeanLocation: WebGLUniformLocation;
    baseStdLocation: WebGLUniformLocation;
    colorTransferStrengthLocation: WebGLUniformLocation;
    enableColorTransferLocation: WebGLUniformLocation;
    erodePxLocation: WebGLUniformLocation;
    featherPxLocation: WebGLUniformLocation;
    aoStrengthLocation: WebGLUniformLocation;
    warpPositionBuffer: WebGLBuffer;
    warpTexCoordBuffer: WebGLBuffer;
    blendPositionBuffer: WebGLBuffer;
    blendTexCoordBuffer: WebGLBuffer;
    hairTexture: WebGLTexture;
    warpTexture: WebGLTexture;
    warpFramebuffer: WebGLFramebuffer;
    fboWidth: number;
    fboHeight: number;
  } | null>(null);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }
    setGlContext(gl);

    const warpVs = createShader(gl, gl.VERTEX_SHADER, warpVsSource);
    const warpFs = createShader(gl, gl.FRAGMENT_SHADER, warpFsSource);
    const blendVs = createShader(gl, gl.VERTEX_SHADER, blendVsSource);
    const blendFs = createShader(gl, gl.FRAGMENT_SHADER, blendFsSource);
    if (!warpVs || !warpFs || !blendVs || !blendFs) return;

    const warpProgram = createProgram(gl, warpVs, warpFs);
    const blendProgram = createProgram(gl, blendVs, blendFs);
    if (!warpProgram || !blendProgram) return;

    const warpPositionLocation = gl.getAttribLocation(warpProgram, "a_position");
    const warpTexCoordLocation = gl.getAttribLocation(warpProgram, "a_texCoord");
    const warpResolutionLocation = gl.getUniformLocation(warpProgram, "u_resolution");
    const hairSamplerLocation = gl.getUniformLocation(warpProgram, "u_hairTex");

    const blendPositionLocation = gl.getAttribLocation(blendProgram, "a_position");
    const blendTexCoordLocation = gl.getAttribLocation(blendProgram, "a_texCoord");
    const blendResolutionLocation = gl.getUniformLocation(blendProgram, "u_resolution");
    const warpSamplerLocation = gl.getUniformLocation(blendProgram, "u_warpTex");
    const texelSizeLocation = gl.getUniformLocation(blendProgram, "u_texelSize");
    const hairMeanLocation = gl.getUniformLocation(blendProgram, "u_hairMean");
    const hairStdLocation = gl.getUniformLocation(blendProgram, "u_hairStd");
    const baseMeanLocation = gl.getUniformLocation(blendProgram, "u_baseMean");
    const baseStdLocation = gl.getUniformLocation(blendProgram, "u_baseStd");
    const colorTransferStrengthLocation = gl.getUniformLocation(blendProgram, "u_colorTransferStrength");
    const enableColorTransferLocation = gl.getUniformLocation(blendProgram, "u_enableColorTransfer");
    const erodePxLocation = gl.getUniformLocation(blendProgram, "u_erodePx");
    const featherPxLocation = gl.getUniformLocation(blendProgram, "u_featherPx");
    const aoStrengthLocation = gl.getUniformLocation(blendProgram, "u_aoStrength");

    if (
      !warpResolutionLocation ||
      !hairSamplerLocation ||
      !blendResolutionLocation ||
      !warpSamplerLocation ||
      !texelSizeLocation ||
      !hairMeanLocation ||
      !hairStdLocation ||
      !baseMeanLocation ||
      !baseStdLocation ||
      !colorTransferStrengthLocation ||
      !enableColorTransferLocation ||
      !erodePxLocation ||
      !featherPxLocation ||
      !aoStrengthLocation
    ) {
      return;
    }

    const warpPositionBuffer = gl.createBuffer()!;
    const warpTexCoordBuffer = gl.createBuffer()!;
    const blendPositionBuffer = gl.createBuffer()!;
    const blendTexCoordBuffer = gl.createBuffer()!;

    const hairTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, hairTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    const warpTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, warpTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.max(1, outputWidth), Math.max(1, outputHeight), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    const warpFramebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, warpFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, warpTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const fullscreenPositions = new Float32Array([
      0, 0, outputWidth, 0, 0, outputHeight,
      0, outputHeight, outputWidth, 0, outputWidth, outputHeight,
    ]);
    const fullscreenTex = new Float32Array([
      0, 0, 1, 0, 0, 1,
      0, 1, 1, 0, 1, 1,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, blendPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, fullscreenPositions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, blendTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, fullscreenTex, gl.STATIC_DRAW);

    setProgramInfo({
      warpProgram,
      blendProgram,
      warpPositionLocation,
      warpTexCoordLocation,
      warpResolutionLocation,
      hairSamplerLocation,
      blendPositionLocation,
      blendTexCoordLocation,
      blendResolutionLocation,
      warpSamplerLocation,
      texelSizeLocation,
      hairMeanLocation,
      hairStdLocation,
      baseMeanLocation,
      baseStdLocation,
      colorTransferStrengthLocation,
      enableColorTransferLocation,
      erodePxLocation,
      featherPxLocation,
      aoStrengthLocation,
      warpPositionBuffer,
      warpTexCoordBuffer,
      blendPositionBuffer,
      blendTexCoordBuffer,
      hairTexture,
      warpTexture,
      warpFramebuffer,
      fboWidth: Math.max(1, outputWidth),
      fboHeight: Math.max(1, outputHeight),
    });

    const numTriangles = gridCols * gridRows * 2;
    const texCoords = new Float32Array(numTriangles * 3 * 2);
    let tIdx = 0;
    
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const u0 = c / gridCols;
        const v0 = r / gridRows;
        const u1 = (c + 1) / gridCols;
        const v1 = (r + 1) / gridRows;

        // Triangle 1
        texCoords[tIdx++] = u0; texCoords[tIdx++] = v0;
        texCoords[tIdx++] = u1; texCoords[tIdx++] = v0;
        texCoords[tIdx++] = u0; texCoords[tIdx++] = v1;

        // Triangle 2
        texCoords[tIdx++] = u0; texCoords[tIdx++] = v1;
        texCoords[tIdx++] = u1; texCoords[tIdx++] = v0;
        texCoords[tIdx++] = u1; texCoords[tIdx++] = v1;
      }
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, warpTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    return () => {
      gl.deleteProgram(warpProgram);
      gl.deleteProgram(blendProgram);
      gl.deleteShader(warpVs);
      gl.deleteShader(warpFs);
      gl.deleteShader(blendVs);
      gl.deleteShader(blendFs);
      gl.deleteBuffer(warpPositionBuffer);
      gl.deleteBuffer(warpTexCoordBuffer);
      gl.deleteBuffer(blendPositionBuffer);
      gl.deleteBuffer(blendTexCoordBuffer);
      gl.deleteTexture(hairTexture);
      gl.deleteTexture(warpTexture);
      gl.deleteFramebuffer(warpFramebuffer);
    };
  }, [image, outputWidth, outputHeight, gridCols, gridRows]);

  useEffect(() => {
    if (!glContext || !programInfo) return;
    glContext.activeTexture(glContext.TEXTURE0);
    glContext.bindTexture(glContext.TEXTURE_2D, programInfo.hairTexture);
    glContext.pixelStorei(glContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, image);
  }, [glContext, programInfo, image]);

  // Update warped vertices and render
  useEffect(() => {
    const gl = glContext;
    const info = programInfo;
    if (!gl || !info || !canvasRef.current) return;

    if (programInfo.fboWidth !== Math.max(1, outputWidth) || programInfo.fboHeight !== Math.max(1, outputHeight)) {
      gl.bindTexture(gl.TEXTURE_2D, programInfo.warpTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, Math.max(1, outputWidth), Math.max(1, outputHeight), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.blendPositionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          0, 0, outputWidth, 0, 0, outputHeight,
          0, outputHeight, outputWidth, 0, outputWidth, outputHeight,
        ]),
        gl.DYNAMIC_DRAW
      );
      setProgramInfo((prev) => (prev ? { ...prev, fboWidth: Math.max(1, outputWidth), fboHeight: Math.max(1, outputHeight) } : prev));
    }

    const warpedGrid = computeMLSGrid(
      gridCols,
      gridRows,
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      srcPoints,
      dstPoints,
      warpType
    );

    // 2. Build triangle vertices for WebGL
    const numTriangles = gridCols * gridRows * 2;
    const positions = new Float32Array(numTriangles * 3 * 2);
    let pIdx = 0;

    const getVertex = (c: number, r: number) => {
      const i = (r * (gridCols + 1) + c) * 2;
      return [warpedGrid[i], warpedGrid[i + 1]];
    };

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const v00 = getVertex(c, r);
        const v10 = getVertex(c + 1, r);
        const v01 = getVertex(c, r + 1);
        const v11 = getVertex(c + 1, r + 1);

        // Triangle 1
        positions[pIdx++] = v00[0]; positions[pIdx++] = v00[1];
        positions[pIdx++] = v10[0]; positions[pIdx++] = v10[1];
        positions[pIdx++] = v01[0]; positions[pIdx++] = v01[1];

        // Triangle 2
        positions[pIdx++] = v01[0]; positions[pIdx++] = v01[1];
        positions[pIdx++] = v10[0]; positions[pIdx++] = v10[1];
        positions[pIdx++] = v11[0]; positions[pIdx++] = v11[1];
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, info.warpFramebuffer);
    gl.viewport(0, 0, outputWidth, outputHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(info.warpProgram);
    gl.disable(gl.BLEND);

    gl.bindBuffer(gl.ARRAY_BUFFER, info.warpPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(info.warpPositionLocation);
    gl.vertexAttribPointer(info.warpPositionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, info.warpTexCoordBuffer);
    gl.enableVertexAttribArray(info.warpTexCoordLocation);
    gl.vertexAttribPointer(info.warpTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(info.warpResolutionLocation, outputWidth, outputHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, info.hairTexture);
    gl.uniform1i(info.hairSamplerLocation, 0);

    gl.drawArrays(gl.TRIANGLES, 0, numTriangles * 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, outputWidth, outputHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(info.blendProgram);
    gl.disable(gl.BLEND);

    gl.bindBuffer(gl.ARRAY_BUFFER, info.blendPositionBuffer);
    gl.enableVertexAttribArray(info.blendPositionLocation);
    gl.vertexAttribPointer(info.blendPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, info.blendTexCoordBuffer);
    gl.enableVertexAttribArray(info.blendTexCoordLocation);
    gl.vertexAttribPointer(info.blendTexCoordLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(info.blendResolutionLocation, outputWidth, outputHeight);
    gl.uniform2f(info.texelSizeLocation, 1 / Math.max(1, outputWidth), 1 / Math.max(1, outputHeight));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, info.warpTexture);
    gl.uniform1i(info.warpSamplerLocation, 0);

    const hasTransfer =
      !!baseColorStats &&
      !!hairColorStats &&
      baseColorStats.sampleCount > 20 &&
      hairColorStats.sampleCount > 20;
    const hairMean = hasTransfer ? hairColorStats!.meanRgb.map((v) => v / 255) : [0, 0, 0];
    const hairStd = hasTransfer ? hairColorStats!.stdRgb.map((v) => v / 255) : [1, 1, 1];
    const baseMean = hasTransfer ? baseColorStats!.meanRgb.map((v) => v / 255) : [0, 0, 0];
    const baseStd = hasTransfer ? baseColorStats!.stdRgb.map((v) => v / 255) : [1, 1, 1];

    gl.uniform3f(info.hairMeanLocation, hairMean[0], hairMean[1], hairMean[2]);
    gl.uniform3f(info.hairStdLocation, hairStd[0], hairStd[1], hairStd[2]);
    gl.uniform3f(info.baseMeanLocation, baseMean[0], baseMean[1], baseMean[2]);
    gl.uniform3f(info.baseStdLocation, baseStd[0], baseStd[1], baseStd[2]);
    gl.uniform1f(info.enableColorTransferLocation, hasTransfer ? 1 : 0);
    gl.uniform1f(info.colorTransferStrengthLocation, 0.18);
    gl.uniform1f(info.erodePxLocation, 1.1);
    gl.uniform1f(info.featherPxLocation, 1.15);
    gl.uniform1f(info.aoStrengthLocation, 0.12);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [
    glContext,
    programInfo,
    srcPoints,
    dstPoints,
    outputWidth,
    outputHeight,
    warpType,
    gridCols,
    gridRows,
    image,
    baseColorStats,
    hairColorStats,
    onCanvasReady,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={outputWidth}
      height={outputHeight}
      style={{ display: "none" }}
    />
  );
}
