import { Injectable } from '@angular/core';

export interface HexTile {
  id: number;
  color: string;
  type: 'hex' | 'pent';
  neighbors: number[];
  x: number;
  y: number;
  z: number;
}

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
export class MapGenerator {
  private readonly map = new Map<number, HexTile>();

  public generateNewMap() {
    this.map.clear();

    // Generate geodesic sphere with approximately 16,000 hex tiles
    // Subdivision levels: 0=12 tiles, 1=42, 2=162, 3=642, 4=2562, 5=10242, 6=40962
    const subdivisionLevel = 8;
    console.log('Generating geodesic sphere with subdivision level:', subdivisionLevel);
    this.generateGeodesicSphere(subdivisionLevel);
  }

  private generateGeodesicSphere(subdivisionLevel: number): void {
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
    const subdividedTriangles = this.subdivideTriangles(vertices, triangles, subdivisionLevel);

    // Convert triangular mesh to hex/pent tiles using dual polyhedron
    this.createHexTilesFromTriangles(vertices, subdividedTriangles);
  }

  private subdivideTriangles(vertices: Vertex[], triangles: Triangle[], level: number): Triangle[] {
    let currentTriangles = [...triangles];
    const vertexCache = new Map<string, number>();

    vertices.forEach((v, i) => {
      vertexCache.set(this.getVertexKey(v), i);
    });


    for (let i = 0; i < level; i++) {
      const newTriangles: Triangle[] = [];

      for (const triangle of currentTriangles) {
        const v1 = vertices[triangle.v1];
        const v2 = vertices[triangle.v2];
        const v3 = vertices[triangle.v3];

        // Get or create midpoint vertices
        const m1Index = this.getMidpointVertex(v1, v2, vertices, vertexCache);
        const m2Index = this.getMidpointVertex(v2, v3, vertices, vertexCache);
        const m3Index = this.getMidpointVertex(v3, v1, vertices, vertexCache);

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

  private getMidpointVertex(
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

    const key = this.getVertexKey(mid);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const index = vertices.length;
    vertices.push(mid);
    cache.set(key, index);
    return index;
  }

  private getVertexKey(vertex: Vertex): string {
    // Round to avoid floating point precision issues
    const precision = 10000000;
    const x = Math.round(vertex.x * precision);
    const y = Math.round(vertex.y * precision);
    const z = Math.round(vertex.z * precision);
    return `${x},${y},${z}`;
  }

  private createHexTilesFromTriangles(vertices: Vertex[], triangles: Triangle[]): void {
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

    // Create tiles centered at vertices (dual polyhedron)
    for (let vIndex = 0; vIndex < vertices.length; vIndex++) {
      const adjacentTriangles = vertexToTriangles.get(vIndex) || [];
      const vertex = vertices[vIndex];

      // Determine tile type based on number of adjacent triangles
      // Pentagons have 5 adjacent triangles, hexagons have 6
      const type: 'hex' | 'pent' = adjacentTriangles.length === 5 ? 'pent' : 'hex';

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

      const tile: HexTile = {
        id: vIndex,
        color: type === 'pent' ? '#000000' : this.getRandomColor(),
        type,
        neighbors: Array.from(neighborSet),
        x: vertex.x,
        y: vertex.y,
        z: vertex.z,
      };

      this.map.set(tile.id, tile);
    }
  }

  private getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  public getMap(): Map<number, HexTile> {
    return this.map;
  }

  public getTile(id: number): HexTile | undefined {
    return this.map.get(id);
  }
}
