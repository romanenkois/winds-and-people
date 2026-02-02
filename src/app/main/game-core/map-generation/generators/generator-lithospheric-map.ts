import { inject, Injectable } from '@angular/core';
import { GameTile, GameTileId, LithosphericPlatesMap, LithosphericType } from '../../map.types';
import { GeneratorHexMap } from './generator-hex-map';
import { MapUtils } from './utils';

export type GeneratorLithosphericHexTile = Pick<
  GameTile,
  | 'id'
  | 'type'
  | 'neighbors'
  | 'x'
  | 'y'
  | 'z'
  | 'lithosphericPlateId'
  | 'lithosphericType'
  | 'lithosphericActivityStress'
>;
export type GeneratorLithosphericMap = Map<GameTileId, GeneratorLithosphericHexTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorLithosphericMapService {
  private readonly _mapUtils = inject(MapUtils);

  public generateLithosphericPlates(baseMap: GeneratorHexMap): {
    map: GeneratorLithosphericMap;
    lithosphericPlatesMap: LithosphericPlatesMap;
  } {
    const numberOfPlates = 20;
    const percentOfOceanicPlates = 0.7;
    const minimumPlateSize = 10;
    const minSeedDistance = 10;

    const tileIds = Array.from(baseMap.keys());
    const seeds: number[] = [];

    // 1. Select Seeds
    let attempts = 0;
    while (seeds.length < numberOfPlates && attempts < 1000) {
      const candidate = tileIds[Math.floor(Math.random() * tileIds.length)];
      if (
        this._mapUtils.isFarEnough({ id: candidate, seeds, map: baseMap, minDist: minSeedDistance })
      ) {
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
      movementVector: { x: number; y: number; z: number };
    };

    const plates: Plate[] = shuffledSeeds.map((seed, index) => {
      // 1. Random Direction
      const dx = Math.random() * 2 - 1;
      const dy = Math.random() * 2 - 1;
      const dz = Math.random() * 2 - 1;
      const dirLen = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      // 2. Non-linear speed distribution (Bias towards calm)
      // Cubed random pushes distribution heavily towards 0, making fast plates rare.
      // Speed ranges from ~0.1 to 1.0 relative to max.
      const speed = Math.pow(Math.random(), 3) * 0.9 + 0.1;

      return {
        id: index,
        seedId: seed,
        type: index < oceanCount ? 'ocean' : 'land',
        tiles: new Set([seed]),
        frontier: new Set(),
        movementVector: {
          x: (dx / dirLen) * speed,
          y: (dy / dirLen) * speed,
          z: (dz / dirLen) * speed,
        },
      };
    });

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
          // chance to skip this tile this turn -> controls overall speed / noise.
          // Reduced skip chance from 0.9 to 0.2 to reduce "fur" / noise.
          if (Math.random() > 0.1) continue;

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
            Math.abs(tile.z - seedTile.z),
          );

          // Weight formula:
          // 1. Prioritize connectivity (myNeighbors * 10) - encourages filling local holes.
          // 2. Penalize distance (dist * 0.5) - prevents long tentacles stretching far from center.
          //    If a plate is very far, it will have negative weight, losing to any closer plate.
          const weight = myNeighbors * 20 - dist * 0.5 + Math.random();

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

    // 3.5 Smoothing Pass (Reduce "Fur")
    // We do a few passes of cellular automata to smooth boundaries.
    for (let i = 0; i < 6; i++) {
      const changes = new Map<number, number>(); // tileId -> newPlateId

      for (const [tileId, currentPlateId] of assignedTiles) {
        const tile = baseMap.get(tileId);
        if (!tile) continue;

        const neighborCounts = new Map<number, number>();
        tile.neighbors.forEach((n) => {
          if (assignedTiles.has(n)) {
            const pid = assignedTiles.get(n)!;
            neighborCounts.set(pid, (neighborCounts.get(pid) || 0) + 1);
          }
        });

        let maxC = 0;
        let bestPid = currentPlateId;

        for (const [pid, count] of neighborCounts) {
          if (count > maxC) {
            maxC = count;
            bestPid = pid;
          }
        }

        // Threshold 4 for Hex grid means strict majority (4/6).
        // If current plate has 2 neighbors and other has 4, we flip.
        // It smooths out 1-tile protrusions.
        if (bestPid !== currentPlateId && maxC >= 4) {
          changes.set(tileId, bestPid);
        }
      }

      if (changes.size === 0) break;

      for (const [tid, newPid] of changes) {
        const oldPid = assignedTiles.get(tid)!;
        assignedTiles.set(tid, newPid);
        plates[oldPid].tiles.delete(tid);
        plates[newPid].tiles.add(tid);
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

    // 5. Calculate Stress
    // Stress > 0 -> Collision / Convergent
    // Stress < 0 -> Divergent
    // Stress ~ 0 -> Transform / Sliding
    const tileStress = new Map<number, number>();

    for (const [id, assignedPid] of assignedTiles) {
      let stress = 0;
      const tile = baseMap.get(id);
      const myPlate = plates[assignedPid];

      if (tile && myPlate) {
        tile.neighbors.forEach((nid) => {
          const neighborPid = assignedTiles.get(nid);
          if (neighborPid !== undefined && neighborPid !== assignedPid) {
            const neighborPlate = plates[neighborPid];
            const neighborTile = baseMap.get(nid);

            if (neighborTile && neighborPlate) {
              const dx = neighborTile.x - tile.x;
              const dy = neighborTile.y - tile.y;
              const dz = neighborTile.z - tile.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;

              const vRelX = myPlate.movementVector.x - neighborPlate.movementVector.x;
              const vRelY = myPlate.movementVector.y - neighborPlate.movementVector.y;
              const vRelZ = myPlate.movementVector.z - neighborPlate.movementVector.z;

              // Project relative velocity onto the direction to neighbor
              const closingSpeed = vRelX * nx + vRelY * ny + vRelZ * nz;

              // STABILIZATION & CALMING:
              // Use a power function to suppress low-intensity (sliding) noise
              // and dampen extreme high-speed head-on collisions.
              const speedSign = Math.sign(closingSpeed);
              const speedMag = Math.abs(closingSpeed);
              // Suppress values closer to 0 (sliding), emphasize direct hits
              const stableSpeed = speedSign * Math.pow(speedMag, 1.5);

              // Mass Factor: Use Log instead of Sqrt for better scaling stability on huge maps
              // Prevents massive plates from producing excessively extreme stress
              const sizeFactor = Math.log(
                Math.min(myPlate.tiles.size, neighborPlate.tiles.size) + Math.E,
              );

              // Apply a global calming factor
              const globalCalming = 0.5;

              stress += stableSpeed * sizeFactor * globalCalming;
            }
          }
        });
      }
      tileStress.set(id, stress);
    }

    // 6. Spread Stress (Spread Collisions)
    // Land plates propagate collision stress further (Simulation of orogeny)
    // Ocean plates propagate less (Subduction is cleaner)
    const currentStress = new Map<number, number>(tileStress);
    const activeBorderTiles = Array.from(tileStress.entries()).filter(
      ([_, s]) => Math.abs(s) > 0.01,
    );

    for (const [sourceId, sourceStress] of activeBorderTiles) {
      const sourceTile = baseMap.get(sourceId);
      if (!sourceTile) continue;

      const pid = assignedTiles.get(sourceId)!;
      const plate = plates[pid];
      // Decay factor: Land propagates further (lower k), Ocean stops closer (higher k)
      // Since coordinates are -1 to 1, distance 0.1 is significant (~5% of world)
      const k = plate.type === 'land' ? 10 : 60;
      const maxDist = plate.type === 'land' ? 0.3 : 0.08;

      const queue: number[] = [sourceId];
      const visited = new Set<number>([sourceId]);

      let head = 0;
      while (head < queue.length) {
        const currId = queue[head++];
        const currTile = baseMap.get(currId);
        if (!currTile) continue;

        for (const nid of currTile.neighbors) {
          if (assignedTiles.get(nid) !== pid) continue; // Stay in plate
          if (visited.has(nid)) continue;

          const nTile = baseMap.get(nid);
          if (!nTile) continue;

          const dx = nTile.x - sourceTile.x;
          const dy = nTile.y - sourceTile.y;
          const dz = nTile.z - sourceTile.z;
          const physicalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (physicalDist > maxDist) continue;

          // Exponential decay
          const factor = Math.exp(-physicalDist * k);
          const newStress = sourceStress * factor;
          const existing = currentStress.get(nid) || 0;

          if (Math.abs(newStress) > Math.abs(existing)) {
            currentStress.set(nid, newStress);
          }

          visited.add(nid);
          queue.push(nid);
        }
      }
    }

    // 7. Construct Result
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
        lithosphericActivityStress: currentStress.get(id) || 0,
      });
    }

    const lithosphericPlatesMap: LithosphericPlatesMap = new Map();
    plates.forEach((p) => {
      if (p.tiles.size > 0) {
        lithosphericPlatesMap.set(p.id, {
          id: p.id,
          type: p.type,
          tiles: Array.from(p.tiles),
          plateMovementVector: p.movementVector,
        });
      }
    });

    return { map: resultMap, lithosphericPlatesMap };
  }
}
