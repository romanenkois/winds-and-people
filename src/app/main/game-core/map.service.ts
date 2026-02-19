import { inject, Injectable } from '@angular/core';
import { Biome, GameTile, MapMode } from './map.types';
import { MapGeneratorService } from './map-generation/map-generator.service';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private readonly _mapGeneratorService = inject(MapGeneratorService);

  private map = new Map<number, GameTile>();

  public generateNewMap(subdivisionLevel: number) {
    this.map.clear();
    const totalTiles = 10 * Math.pow(4, subdivisionLevel) + 2;
    console.log(
      'Generating geodesic sphere with subdivision level:',
      subdivisionLevel,
      'with total tiles:',
      totalTiles,
    );
    this.map = this._mapGeneratorService.generateMap({ subdivisionLevel }).gameMap;
  }

  public getTitleColor(tile: GameTile, coloringType: MapMode): string {
    switch (coloringType) {
      case MapMode.Humidity:
        return this._getColorByHumidity(tile);
      case MapMode.Elevation:
        return this._getColorByElevation(tile);
      case MapMode.Temperature:
        return this._getColorByTemperature(tile);
      case MapMode.Biomes:
        return this._getColorByBiome(tile);
      case MapMode.Lithospheric:
        return this._getColorByLithospheric(tile);
      case MapMode.LithosphericActivity:
        return this._getColorByLithosphericActivity(tile);

      default:
        return this._getColorByBiome(tile);
    }
  }

  private _getColorByHumidity(tile: GameTile): string {
    const humidity = tile.climateData.humidity;
    if (humidity >= 0 && humidity < 20) {
      return '#E0F7FA'; // Very Light Blue
    } else if (humidity >= 20 && humidity < 40) {
      return '#81D4FA'; // Light Blue
    } else if (humidity >= 40 && humidity < 60) {
      return '#29B6F6'; // Sky Blue
    } else if (humidity >= 60 && humidity < 80) {
      return '#0288D1'; // Darker Blue
    } else if (humidity >= 80 && humidity <= 100) {
      return '#01579B'; // Deep Blue
    } else {
      return '#000000'; // Black as fallback
    }
  }

  private _getColorByElevation(tile: GameTile): string {
    const elevation = tile.terrainData.elevation;

    if (elevation < 0) {
      // Ocean: blue hue (220), lightness decreases with depth
      const depth = Math.abs(elevation);
      // Map depth 0..1000 to lightness 50..10
      const lightness = Math.max(10, 50 - (depth / 5000) * 40);
      return `hsl(220, 80%, ${lightness}%)`;
    }

    // Land Logic
    if (elevation < 1000) {
      // Green (100) transition to Brown (35)
      const t = elevation / 1000;
      const hue = 100 - t * 65;
      return `hsl(${hue}, 55%, 40%)`;
    }

    if (elevation > 10000) {
      return '#ff00f2';
    }

    // High Mountains: Brown to White (snow cap)
    // Transition starts at 1200, peaks around 3000
    const val = Math.min(1, (elevation - 1200) / 1800);
    const lightness = 40 + val * 60; // 40 -> 100
    const saturation = 55 * (1 - val); // Desaturate towards white
    return `hsl(35, ${saturation}%, ${lightness}%)`;
  }

  private _getColorByTemperature(tile: GameTile): string {
    const temperature = tile.climateData.temperature;
    if (temperature < -10) {
      return '#FFFFFF'; // Polar
    } else if (temperature >= -10 && temperature < 0) {
      return '#E0FFFF'; // Freezing
    } else if (temperature >= 0 && temperature < 10) {
      return '#87CEEB'; // Cold
    } else if (temperature >= 10 && temperature < 20) {
      return '#90EE90'; // Temperate
    } else if (temperature >= 20 && temperature < 30) {
      return '#FFD700'; // Warm
    } else {
      return '#FF4500'; // Hot
    }
  }

  private _getColorByBiome(tile: GameTile): string {
    switch (tile.climateData.biome) {
      case 'deep ocean':
        return '#000080';
      case 'shallow ocean':
        return '#0000CD';
      case 'freezing ocean':
        return '#ADD8E6';
      case 'arctic ocean':
        return '#E0FFFF';
      case 'coral reef':
        return '#2384a1';
      case 'inland sea':
        return '#1e9aff';
      case 'freezing inland sea':
        return '#96dce6';
      case 'plains':
        return '#afd392';
      case 'forest':
        return '#0a7e0a';
      case 'desert':
        return '#f1c19f';
      case 'jungle':
        return '#79d43c';
      case 'mountain':
        return '#575656';
      case 'taiga':
        return '#2d522d';
      case 'tundra':
        return '#E0FFFF';
      case 'arctic desert':
        return '#ffffff';
      default:
        return '#000000'; // Black as fallback
    }
  }

  private _getColorByLithospheric(tile: GameTile): string {
    return this._generatePlateColor(
      tile.lithosphericData.lithosphericPlateId,
      tile.lithosphericData.lithosphericType,
    );
  }

  private _getColorByLithosphericActivity(tile: GameTile): string {
    const stress = tile.lithosphericData.lithosphericActivityStress || 0;

    // Neutral / Sliding area -> Pale Plate Color to distinguish plates
    if (Math.abs(stress) < 0.01) {
      const hue = (tile.lithosphericData.lithosphericPlateId * 137.5) % 360;
      return `hsl(${hue}, 100%, 85%)`;
    }

    if (stress > 0) {
      // Collision -> Red
      // Max stress usually around 2.5, rarely up to 5-6.
      // We clamp saturation logic between 0 and 2.5 for visual range.
      const intensity = Math.min(1, stress / 6);
      // Lightness moves from 90 (pale red) to 40 (deep red)
      const lightness = 90 - intensity * 50;
      return `hsl(0, 100%, ${lightness}%)`;
    } else {
      // Divergent -> Blue
      const intensity = Math.min(1, Math.abs(stress) / 2.5);
      // Lightness moves from 90 (pale blue) to 40 (deep blue)
      const lightness = 90 - intensity * 50;
      return `hsl(240, 100%, ${lightness}%)`;
    }
  }

  private _generatePlateColor(plateId: number, lithosphericType: string): string {
    // Generate a hue based on the plate ID
    const hue = (plateId * 137.5) % 360; // Golden angle for better color distribution

    if (lithosphericType === 'ocean') {
      // Blue-shifted hues for oceans
      const oceanHue = (hue + 200) % 360; // Shift towards blue
      return `hsl(${oceanHue}, 100%, 50%)`;
    } else {
      // Green-shifted hues for land
      const landHue = (hue + 120) % 360; // Shift towards green
      return `hsl(${landHue}, 75%, 45%)`;
    }
  }

  public getMap(): Map<number, GameTile> {
    return this.map;
  }

  public getTile(id: number): GameTile | undefined {
    return this.map.get(id);
  }
}
