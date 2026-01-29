import { Injectable } from '@angular/core';
import { GameTile, GameTileId, LithosphericType } from '../../map.types';
import { GeneratorHexMap } from './generator-hex-map';

export type GeneratorLithosphericHexTile = Pick<
  GameTile,
  'id' | 'type' | 'neighbors' | 'x' | 'y' | 'z' | 'lithosphericPlateId' | 'lithosphericType'
>;
export type GeneratorLithosphericMap = Map<GameTileId, GeneratorLithosphericHexTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorLithosphericMapService {
  public generateLithosphericPlates(baseMap: GeneratorHexMap): GeneratorLithosphericMap {
    const numberOfPlates = 20;
    const percentOfOceanicPlates = 0.7;
    const minimumPlateSize = 10;
    const minSeedDistance = 200;

    const tileIds = Array.from(baseMap.keys());
    const seeds: number[] = [];

    // 1. Select Seeds
    let attempts = 0;
    while (seeds.length < numberOfPlates && attempts < 1000) {
      const candidate = tileIds[Math.floor(Math.random() * tileIds.length)];
      if (this._isFarEnough(candidate, seeds, baseMap, minSeedDistance)) {
        seeds.push(candidate);
      }
      attempts++;
    }
    // Fallback fill
    while (seeds.length < numberOfPlates) {
      const candidate = tileIds[Math.floor(Math.random() * tileIds.length)];
      if (!seeds.includes(candidate)) seeds.push(candidate);
    }

    // 2. Assign Plate Properties (70% Oceanic, 30% Continental)
    const shuffledSeeds = [...seeds].sort(() => Math.random() - 0.5);
    const oceanCount = Math.floor(numberOfPlates * percentOfOceanicPlates);

    type Plate = {
      id: number;
      seedId: number;
      type: LithosphericType;
      tiles: Set<number>;
      frontier: Set<number>;
    };

    const plates: Plate[] = shuffledSeeds.map((seed, index) => ({
      id: index,
      seedId: seed,
      type: index < oceanCount ? 'ocean' : 'land',
      tiles: new Set([seed]),
      frontier: new Set(),
    }));

    const assignedTiles = new Map<number, number>(); // tileId -> plateId
    plates.forEach((p) => assignedTiles.set(p.seedId, p.id));

    // Init frontiers
    plates.forEach((p) => {
      const tile = baseMap.get(p.seedId);
      if (tile) {
        tile.neighbors.forEach((n) => {
          if (!assignedTiles.has(n)) p.frontier.add(n);
        });
      }
    });

    // 3. Growth Loop
    let unassignedCount = baseMap.size - seeds.length;

    while (unassignedCount > 0) {
      let movesMade = false;
      const bids = new Map<number, { plateId: number; weight: number }[]>();

      for (const plate of plates) {
        if (plate.frontier.size === 0) continue;

        // Instead of limited expansion count, we try to grow a percentage of the frontier.
        // This ensures broad plates grow at the same linear speed as narrow plates (tentacles).
        // A tentacle with 1 frontier grows 1 tile. A blob with 100 frontier grows ~50 tiles.
        // Both advance the "front" by roughly the same distance.
        const candidates = Array.from(plate.frontier);
        const seedTile = baseMap.get(plate.seedId);

        for (const tileId of candidates) {
          // 40% chance to skip this tile this turn -> controls overall speed / noise.
          if (Math.random() > 0.2) continue;

          const tile = baseMap.get(tileId);
          if (!tile || !seedTile) continue;

          let myNeighbors = 0;
          tile.neighbors.forEach((n) => {
            if (assignedTiles.get(n) === plate.id) myNeighbors++;
          });

          // Distance penalty logic:
          // We calculate hex distance from the seed.
          // Hex distance = max(abs(dx), abs(dy), abs(dz))
          const dist = Math.max(
            Math.abs(tile.x - seedTile.x),
            Math.abs(tile.y - seedTile.y),
            Math.abs(tile.z - seedTile.z)
          );

          // Weight formula:
          // 1. Prioritize connectivity (myNeighbors * 10) - encourages filling local holes.
          // 2. Penalize distance (dist * 0.5) - prevents long tentacles stretching far from center.
          //    If a plate is very far, it will have negative weight, losing to any closer plate.
          const weight = myNeighbors * 10 - dist * 0.3 + Math.random();

          if (!bids.has(tileId)) bids.set(tileId, []);
          bids.get(tileId)!.push({ plateId: plate.id, weight });
        }
      }

      if (bids.size === 0) break;

      // Resolve Bids
      for (const [tileId, proposals] of bids) {
        // Find highest weight
        let best = proposals[0];
        for (let i = 1; i < proposals.length; i++) {
          if (proposals[i].weight > best.weight) best = proposals[i];
        }

        // Assign
        assignedTiles.set(tileId, best.plateId);
        plates[best.plateId].tiles.add(tileId);
        unassignedCount--;
        movesMade = true;

        // Update Frontiers
        // 1. Remove tileId from all frontiers
        plates.forEach((p) => p.frontier.delete(tileId));

        // 2. Add unassigned neighbors to winner's frontier
        const tile = baseMap.get(tileId);
        tile?.neighbors.forEach((n) => {
          if (!assignedTiles.has(n)) {
            plates[best.plateId].frontier.add(n);
          }
        });
      }

      if (!movesMade) break;
    }

    // Post-loop cleanup for isolated tiles (assign to most frequent neighbor)
    if (unassignedCount > 0) {
      for (const [id, tile] of baseMap) {
        if (!assignedTiles.has(id)) {
          const neighborPlates = new Map<number, number>();
          let maxP = -1;
          let maxC = -1;
          tile.neighbors.forEach((n) => {
            const pid = assignedTiles.get(n);
            if (pid !== undefined) {
              const count = (neighborPlates.get(pid) || 0) + 1;
              neighborPlates.set(pid, count);
              if (count > maxC) {
                maxC = count;
                maxP = pid;
              }
            }
          });

          const targetPid = maxP !== -1 ? maxP : 0;
          assignedTiles.set(id, targetPid);
          plates[targetPid].tiles.add(id);
        }
      }
    }

    // 4. Validate & Merge Small Plates
    let merged = true;
    while (merged) {
      merged = false;
      // Re-evaluate sizes
      const activePlates = plates.filter((p) => p.tiles.size > 0);
      activePlates.sort((a, b) => a.tiles.size - b.tiles.size);

      for (const p of activePlates) {
        if (p.tiles.size < minimumPlateSize) {
          // Finds heaviest neighbor plate
          const neighborCounts = new Map<number, number>();
          for (const tid of p.tiles) {
            baseMap.get(tid)?.neighbors.forEach((nid) => {
              const npid = assignedTiles.get(nid);
              if (npid !== undefined && npid !== p.id) {
                neighborCounts.set(npid, (neighborCounts.get(npid) || 0) + 1);
              }
            });
          }

          let targetPid = -1;
          let maxC = -1;
          for (const [pid, c] of neighborCounts) {
            if (c > maxC) {
              maxC = c;
              targetPid = pid;
            }
          }

          if (targetPid !== -1) {
            // Merge p into targetPid
            for (const tid of p.tiles) {
              assignedTiles.set(tid, targetPid);
              plates[targetPid].tiles.add(tid);
            }
            p.tiles.clear();
            console.log(`Merged small plate ${p.id} into ${targetPid}`);
            merged = true;
            break; // Restart loop after merge to avoid stale state in simple implementation
          }
        }
      }
    }

    // 5. Construct Result
    const resultMap = new Map<GameTileId, GeneratorLithosphericHexTile>();
    for (const [id, base] of baseMap) {
      const pid = assignedTiles.get(id)!;
      const p = plates[pid];
      // Fallback if plate lost all tiles (shouldn't happen if map constr is correct)
      const finalType = p ? p.type : 'ocean';

      resultMap.set(id, {
        ...base,
        lithosphericPlateId: pid,
        lithosphericType: finalType,
      });
    }

    return resultMap;
  }

  private _isFarEnough(
    id: number,
    seeds: number[],
    map: GeneratorHexMap,
    minDist: number,
  ): boolean {
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
}
