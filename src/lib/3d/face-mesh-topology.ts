/**
 * face-mesh-topology.ts
 *
 * Loads and caches the canonical MediaPipe Face Mesh topology JSON.
 * Provides accessors for the triangle connectivity, per-vertex UVs,
 * and the scalp-region vertex subset used for hair projection.
 */

export type FaceMeshTopology = {
  vertexCount: number;
  /** Triangle index triples into the 468-vertex array */
  triangles: [number, number, number][];
  /** Per-vertex canonical UV [u, v] (468 entries) */
  uvs: [number, number][];
  /** Landmark indices that belong to the scalp / hair-bearing region */
  scalpIndices: number[];
};

let cachedTopology: FaceMeshTopology | null = null;

export async function loadFaceMeshTopology(): Promise<FaceMeshTopology> {
  if (cachedTopology) return cachedTopology;

  const res = await fetch("/3d/face_mesh_canonical.json");
  if (!res.ok) throw new Error(`Failed to load face mesh topology: ${res.status}`);

  const data = (await res.json()) as FaceMeshTopology;
  cachedTopology = data;
  return data;
}

/**
 * Returns a flat Uint32Array of triangle indices suitable for
 * THREE.BufferGeometry.setIndex().
 */
export function buildIndexArray(triangles: [number, number, number][]): Uint32Array {
  const arr = new Uint32Array(triangles.length * 3);
  for (let i = 0; i < triangles.length; i++) {
    arr[i * 3] = triangles[i][0];
    arr[i * 3 + 1] = triangles[i][1];
    arr[i * 3 + 2] = triangles[i][2];
  }
  return arr;
}

/**
 * Returns a Float32Array of canonical UV coordinates (2 floats per vertex)
 * suitable for THREE.BufferGeometry.setAttribute('uv', ...).
 */
export function buildCanonicalUVArray(uvs: [number, number][]): Float32Array {
  const arr = new Float32Array(uvs.length * 2);
  for (let i = 0; i < uvs.length; i++) {
    arr[i * 2] = uvs[i][0];
    arr[i * 2 + 1] = 1.0 - uvs[i][1]; // flip V: Three.js is bottom-up
  }
  return arr;
}

/**
 * Given the full 468-landmark topology, builds a sub-mesh for just the scalp indices.
 * Returns re-indexed triangles (only those fully contained in scalpIndices) and
 * a mapping from old landmark index → new compact vertex index.
 */
export function buildScalpSubMesh(topology: FaceMeshTopology): {
  indexMap: Map<number, number>; // landmark index → compact index
  triangles: [number, number, number][];
  vertexCount: number;
} {
  const scalpSet = new Set(topology.scalpIndices);

  // Only keep triangles where ALL THREE vertices are scalp vertices
  const scalpTriangles = topology.triangles.filter(
    ([a, b, c]) => scalpSet.has(a) && scalpSet.has(b) && scalpSet.has(c)
  );

  // Build compact index map
  const indexMap = new Map<number, number>();
  for (const [a, b, c] of scalpTriangles) {
    if (!indexMap.has(a)) indexMap.set(a, indexMap.size);
    if (!indexMap.has(b)) indexMap.set(b, indexMap.size);
    if (!indexMap.has(c)) indexMap.set(c, indexMap.size);
  }

  // Re-index triangles
  const remapped: [number, number, number][] = scalpTriangles.map(([a, b, c]) => [
    indexMap.get(a)!,
    indexMap.get(b)!,
    indexMap.get(c)!,
  ]);

  return {
    indexMap,
    triangles: remapped,
    vertexCount: indexMap.size,
  };
}
