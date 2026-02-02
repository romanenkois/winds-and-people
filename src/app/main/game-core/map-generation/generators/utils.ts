import { Injectable } from '@angular/core';
import { GeneratorHexMap } from './generator-hex-map';
import {
  GeneratorLithosphericHexTile,
  GeneratorLithosphericMap,
} from './generator-lithospheric-map';

@Injectable({
  providedIn: 'root',
})
export class MapUtils {
  public isFarEnough(params: { id: number; seeds: number[]; map: GeneratorHexMap; minDist: number }): boolean {
    const { id, seeds, map, minDist } = params;
    if (seeds.length === 0) return true;
    const queue: { id: number; dist: number }[] = [{ id, dist: 0 }];
    const visited = new Set<number>([id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.dist >= minDist) continue;

      const tile = map.get(current.id);
      if (tile) {
        for (const n of tile.neighbors) {
          if (seeds.includes(n)) return false;
          if (!visited.has(n)) {
            visited.add(n);
            queue.push({ id: n, dist: current.dist + 1 });
          }
        }
      }
    }
    return true;
  }

  public closestSelectedPlateTile<
    T extends GeneratorLithosphericMap,
    R extends GeneratorLithosphericHexTile,
  >(params: {
    map: T;
    tile: R;
    type: 'ocean' | 'land';
    skipHexDistance?: number;
  }): { hexDistance: number; relativeDistance: number; tile: R }[] {
    const { map, tile, type, skipHexDistance } = params;
    const results: { hexDistance: number; relativeDistance: number; tile: R }[] = [];

    // 1. Check if start tile matches the requested type
    if (tile.lithosphericType === type) {
      return [{ hexDistance: 0, relativeDistance: 0, tile }];
    }

    // 2. BFS Initialization
    const visited = new Set<number>([tile.id]);
    const queue: { id: number; dist: number }[] = [{ id: tile.id, dist: 0 }];
    let minDistFound = Infinity;

    // 3. BFS Loop
    while (queue.length > 0) {
      const current = queue.shift()!;

      if (skipHexDistance !== undefined && current.dist > skipHexDistance) {
        break;
      }

      // If we've processed all nodes at a distance less than the found minimum, we can stop.
      if (current.dist >= minDistFound) {
        break;
      }

      const currentMapTile = map.get(current.id);
      if (!currentMapTile) continue;

      for (const neighborId of currentMapTile.neighbors) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const neighborTile = map.get(neighborId) as R | undefined;
        if (!neighborTile) continue;

        const nextDist = current.dist + 1;

        if (neighborTile.lithosphericType === type) {
          // Found a matching tile
          if (minDistFound === Infinity) {
            minDistFound = nextDist;
          }

          if (nextDist === minDistFound) {
            const dx = neighborTile.x - tile.x;
            const dy = neighborTile.y - tile.y;
            const dz = neighborTile.z - tile.z;
            const relativeDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            results.push({
              hexDistance: nextDist,
              relativeDistance,
              tile: neighborTile,
            });
          }
        } else {
          // Found a non-matching tile - continue searching if we haven't found closest match yet
          if (minDistFound === Infinity) {
            queue.push({ id: neighborId, dist: nextDist });
          }
        }
      }
    }

    return results;
  }
}
