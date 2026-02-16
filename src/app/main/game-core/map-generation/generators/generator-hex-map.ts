import { Injectable } from '@angular/core';
import { GameTileId, GameTile, TileType } from '../../map.types';

export type GeneratorHexMapTile = Pick<GameTile, 'id' | 'base'>;
export type GeneratorHexMap = Map<GameTileId, GeneratorHexMapTile>;

interface Vertex {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: number;
  v2: number;
  v3: number;
}

@Injectable({
  providedIn: 'root',
})
export class GeneratorHexMapService {
  public generateGeodesicSphere(subdivisionLevel: number): GeneratorHexMap {
    // Create icosahedron vertices
    const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
    const vertices: Vertex[] = [
      { x: -1, y: phi, z: 0 },
      { x: 1, y: phi, z: 0 },
      { x: -1, y: -phi, z: 0 },
      { x: 1, y: -phi, z: 0 },
      { x: 0, y: -1, z: phi },
      { x: 0, y: 1, z: phi },
      { x: 0, y: -1, z: -phi },
      { x: 0, y: 1, z: -phi },
      { x: phi, y: 0, z: -1 },
      { x: phi, y: 0, z: 1 },
      { x: -phi, y: 0, z: -1 },
      { x: -phi, y: 0, z: 1 },
    ];

    // Normalize vertices to unit sphere
    for (const vertex of vertices) {
      const length = Math.sqrt(vertex.x ** 2 + vertex.y ** 2 + vertex.z ** 2);
      vertex.x /= length;
      vertex.y /= length;
      vertex.z /= length;
    }

    // Create icosahedron faces (20 triangles)
    const triangles: Triangle[] = [
      { v1: 0, v2: 11, v3: 5 },
      { v1: 0, v2: 5, v3: 1 },
      { v1: 0, v2: 1, v3: 7 },
      { v1: 0, v2: 7, v3: 10 },
      { v1: 0, v2: 10, v3: 11 },
      { v1: 1, v2: 5, v3: 9 },
      { v1: 5, v2: 11, v3: 4 },
      { v1: 11, v2: 10, v3: 2 },
      { v1: 10, v2: 7, v3: 6 },
      { v1: 7, v2: 1, v3: 8 },
      { v1: 3, v2: 9, v3: 4 },
      { v1: 3, v2: 4, v3: 2 },
      { v1: 3, v2: 2, v3: 6 },
      { v1: 3, v2: 6, v3: 8 },
      { v1: 3, v2: 8, v3: 9 },
      { v1: 4, v2: 9, v3: 5 },
      { v1: 2, v2: 4, v3: 11 },
      { v1: 6, v2: 2, v3: 10 },
      { v1: 8, v2: 6, v3: 7 },
      { v1: 9, v2: 8, v3: 1 },
    ];

    // Subdivide triangles
    const subdividedTriangles = this._subdivideTriangles(vertices, triangles, subdivisionLevel);

    // Relax vertices (Spring/Laplacian smoothing) to reduce distortion
    this._relaxVertices(vertices, subdividedTriangles, 5);

    // Convert triangular mesh to hex/pent tiles using dual polyhedron
    const baseMap = this._createHexTilesFromTriangles(vertices, subdividedTriangles);

    return baseMap;
  }

  private _subdivideTriangles(
    vertices: Vertex[],
    triangles: Triangle[],
    level: number,
  ): Triangle[] {
    let currentTriangles = [...triangles];
    const vertexCache = new Map<string, number>();

    vertices.forEach((v, i) => {
      vertexCache.set(this._getVertexKey(v), i);
    });

    for (let i = 0; i < level; i++) {
      const newTriangles: Triangle[] = [];

      for (const triangle of currentTriangles) {
        const v1 = vertices[triangle.v1];
        const v2 = vertices[triangle.v2];
        const v3 = vertices[triangle.v3];

        // Get or create midpoint vertices
        const m1Index = this._getMidpointVertex(v1, v2, vertices, vertexCache);
        const m2Index = this._getMidpointVertex(v2, v3, vertices, vertexCache);
        const m3Index = this._getMidpointVertex(v3, v1, vertices, vertexCache);

        // Create 4 new triangles from the original
        newTriangles.push(
          { v1: triangle.v1, v2: m1Index, v3: m3Index },
          { v1: triangle.v2, v2: m2Index, v3: m1Index },
          { v1: triangle.v3, v2: m3Index, v3: m2Index },
          { v1: m1Index, v2: m2Index, v3: m3Index },
        );
      }

      currentTriangles = newTriangles;
    }

    return currentTriangles;
  }

  private _relaxVertices(vertices: Vertex[], triangles: Triangle[], iterations: number): void {
    for (let iter = 0; iter < iterations; iter++) {
      const adjacency = new Map<number, Set<number>>();
      for (const tri of triangles) {
        if (!adjacency.has(tri.v1)) adjacency.set(tri.v1, new Set());
        if (!adjacency.has(tri.v2)) adjacency.set(tri.v2, new Set());
        if (!adjacency.has(tri.v3)) adjacency.set(tri.v3, new Set());

        adjacency.get(tri.v1)!.add(tri.v2).add(tri.v3);
        adjacency.get(tri.v2)!.add(tri.v1).add(tri.v3);
        adjacency.get(tri.v3)!.add(tri.v1).add(tri.v2);
      }

      const newPositions = new Map<number, Vertex>();

      adjacency.forEach((neighbors, vIndex) => {
        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;

        neighbors.forEach((nIndex) => {
          sumX += vertices[nIndex].x;
          sumY += vertices[nIndex].y;
          sumZ += vertices[nIndex].z;
        });

        const count = neighbors.size;
        const avgX = sumX / count;
        const avgY = sumY / count;
        const avgZ = sumZ / count;

        const length = Math.sqrt(avgX ** 2 + avgY ** 2 + avgZ ** 2);

        newPositions.set(vIndex, {
          x: avgX / length,
          y: avgY / length,
          z: avgZ / length,
        });
      });

      newPositions.forEach((pos, vIndex) => {
        vertices[vIndex] = pos;
      });
    }
  }

  private _getMidpointVertex(
    v1: Vertex,
    v2: Vertex,
    vertices: Vertex[],
    cache: Map<string, number>,
  ): number {
    // Calculate midpoint
    const mid: Vertex = {
      x: (v1.x + v2.x) / 2,
      y: (v1.y + v2.y) / 2,
      z: (v1.z + v2.z) / 2,
    };

    // Normalize to sphere surface
    const length = Math.sqrt(mid.x ** 2 + mid.y ** 2 + mid.z ** 2);
    mid.x /= length;
    mid.y /= length;
    mid.z /= length;

    const key = this._getVertexKey(mid);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const index = vertices.length;
    vertices.push(mid);
    cache.set(key, index);
    return index;
  }

  private _getVertexKey(vertex: Vertex): string {
    // Round to avoid floating point precision issues
    const precision = 10000000;
    const x = Math.round(vertex.x * precision);
    const y = Math.round(vertex.y * precision);
    const z = Math.round(vertex.z * precision);
    return `${x},${y},${z}`;
  }

  private _createHexTilesFromTriangles(vertices: Vertex[], triangles: Triangle[]): GeneratorHexMap {
    // Build adjacency information
    const vertexToTriangles = new Map<number, number[]>();

    for (let i = 0; i < triangles.length; i++) {
      const tri = triangles[i];
      [tri.v1, tri.v2, tri.v3].forEach((vIndex) => {
        if (!vertexToTriangles.has(vIndex)) {
          vertexToTriangles.set(vIndex, []);
        }
        vertexToTriangles.get(vIndex)!.push(i);
      });
    }

    const map: GeneratorHexMap = new Map<GameTileId, GeneratorHexMapTile>();

    // Create tiles centered at vertices (dual polyhedron)
    for (let vIndex = 0; vIndex < vertices.length; vIndex++) {
      const adjacentTriangles = vertexToTriangles.get(vIndex) || [];
      const vertex = vertices[vIndex];

      // Determine tile type based on number of adjacent triangles
      // Pentagons have 5 adjacent triangles, hexagons have 6
      const type: TileType = adjacentTriangles.length === 5 ? TileType.Pent : TileType.Hex;

      // Get neighboring vertices
      const neighborSet = new Set<number>();
      for (const triIndex of adjacentTriangles) {
        const tri = triangles[triIndex];
        [tri.v1, tri.v2, tri.v3].forEach((v) => {
          if (v !== vIndex) {
            neighborSet.add(v);
          }
        });
      }

      // Calculate corners (centroids of adjacent triangles) and sort them angularly
      const centroids: { pos: Vertex; angle: number }[] = [];

      // Calculate basis for sorting
      // Normal is the vertex itself (unit sphere)
      const normal = vertex;
      // Find a tangent vector. If normal is roughly Y, use X. Else use Y.
      let tangent = { x: 0, y: 1, z: 0 };
      if (Math.abs(normal.y) > 0.9) {
        tangent = { x: 1, y: 0, z: 0 };
      }

      // Orthonormalize tangent: t = t - n * (t . n)
      const dot = tangent.x * normal.x + tangent.y * normal.y + tangent.z * normal.z;
      tangent.x -= normal.x * dot;
      tangent.y -= normal.y * dot;
      tangent.z -= normal.z * dot;

      // Normalize tangent
      const tLen = Math.sqrt(tangent.x ** 2 + tangent.y ** 2 + tangent.z ** 2);
      tangent.x /= tLen;
      tangent.y /= tLen;
      tangent.z /= tLen;

      // Bitangent
      const bitangent = {
        x: normal.y * tangent.z - normal.z * tangent.y,
        y: normal.z * tangent.x - normal.x * tangent.z,
        z: normal.x * tangent.y - normal.y * tangent.x,
      };

      for (const triIndex of adjacentTriangles) {
        const tri = triangles[triIndex];
        const centroid = this._calculateTriangleCentroid(tri, vertices);

        // Vector from vertex to centroid
        const vec = {
          x: centroid.x - vertex.x,
          y: centroid.y - vertex.y,
          z: centroid.z - vertex.z,
        };

        // Project to plane
        const u = vec.x * tangent.x + vec.y * tangent.y + vec.z * tangent.z;
        const v = vec.x * bitangent.x + vec.y * bitangent.y + vec.z * bitangent.z;

        const angle = Math.atan2(v, u);

        centroids.push({ pos: centroid, angle });
      }

      // Sort by angle to ensure correct winding order
      centroids.sort((a, b) => a.angle - b.angle);
      const corners = centroids.map((c) => c.pos);

      const tile: GeneratorHexMapTile = {
        id: vIndex,
        base: {
          type,
          neighbors: Array.from(neighborSet),
          cordinates: {
            x: vertex.x,
            y: vertex.y,
            z: vertex.z,
          },
          corners,
        },
      };

      map.set(tile.id, tile);
    }

    return map;
  }

  private _calculateTriangleCentroid(tri: Triangle, vertices: Vertex[]): Vertex {
    const v1 = vertices[tri.v1];
    const v2 = vertices[tri.v2];
    const v3 = vertices[tri.v3];
    return {
      x: (v1.x + v2.x + v3.x) / 3,
      y: (v1.y + v2.y + v3.y) / 3,
      z: (v1.z + v2.z + v3.z) / 3,
    };
  }
}
