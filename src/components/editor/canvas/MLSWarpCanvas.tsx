"use client";

import React, { useRef, useEffect, useState } from "react";
import { computeMLSGrid, type Point2, type MLSWarpType } from "@/lib/image/mlsWarp";

type Props = {
  image: HTMLImageElement;
  srcPoints: Point2[];
  dstPoints: Point2[];
  outputWidth: number;
  outputHeight: number;
  warpType?: MLSWarpType;
  gridCols?: number;
  gridRows?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
};

// Shaders for WebGL rendering
const vsSource = `
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

const fsSource = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;

  void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
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
  warpType = "affine",
  gridCols = 40,
  gridRows = 40,
  onCanvasReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glContext, setGlContext] = useState<WebGLRenderingContext | null>(null);
  const [programInfo, setProgramInfo] = useState<{
    program: WebGLProgram;
    positionLocation: number;
    texCoordLocation: number;
    resolutionLocation: WebGLUniformLocation;
    positionBuffer: WebGLBuffer;
    texCoordBuffer: WebGLBuffer;
    texture: WebGLTexture;
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

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = createProgram(gl, vs, fs);
    if (!program) return;

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution")!;

    const positionBuffer = gl.createBuffer()!;
    const texCoordBuffer = gl.createBuffer()!;

    // Setup texture
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Use premultiplied alpha to ensure edges and alpha transparency render properly in Konva
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    setProgramInfo({
      program,
      positionLocation,
      texCoordLocation,
      resolutionLocation,
      positionBuffer,
      texCoordBuffer,
      texture,
    });
    
    // Precompute texture coordinates
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
    
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    return () => {
      // Cleanup
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(texCoordBuffer);
      gl.deleteTexture(texture);
    };
  }, [image, gridCols, gridRows]);

  // Update warped vertices and render
  useEffect(() => {
    const gl = glContext;
    const info = programInfo;
    if (!gl || !info || !canvasRef.current) return;

    // 1. Calculate warped points using MLS
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

    // 3. Render
    gl.viewport(0, 0, outputWidth, outputHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(info.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, info.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(info.positionLocation);
    gl.vertexAttribPointer(info.positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, info.texCoordBuffer);
    gl.enableVertexAttribArray(info.texCoordLocation);
    gl.vertexAttribPointer(info.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(info.resolutionLocation, outputWidth, outputHeight);

    // Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLES, 0, numTriangles * 3);

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
