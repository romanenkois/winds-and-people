import { inject, Injectable } from '@angular/core';
import { Biome, GameTile } from './map.types';
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

  public getTitleColor(tile: GameTile, coloringType: 'humidity' | 'elevation' | 'temperature' | 'biomes' | 'lithospheric' | never): string {
    switch (coloringType) {
      case 'humidity':
        return this._getColorByHumidity(tile);
      case 'elevation':
        return this._getColorByElevation(tile);
      case 'temperature':
        return this._getColorByTemperature(tile);
      case 'biomes':
        return this._getColorByBiome(tile);
      case 'lithospheric':
        return this._getColorByLithospheric(tile);
      default:
        return this._getColorByBiome(tile);
    }
  }

  private _getColorByHumidity(tile: GameTile): string {
    const humidity = tile.humidity;
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
    const elevation = tile.elevation;
    if (elevation < -200) {
      return '#000080'; // Deep Ocean
    } else if (elevation >= -200 && elevation < 0) {
      return '#0000CD'; // Shallow Ocean
    } else if (elevation >= 0 && elevation < 200) {
      return '#228B22'; // Lowland
    } else if (elevation >= 200 && elevation < 1000) {
      return '#8B4513'; // Highland
    } else {
      return '#A9A9A9'; // Mountain
    }
  }

  private _getColorByTemperature(tile: GameTile): string {
    const temperature = tile.temperature;
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
    switch (tile.lithosphericType) {
      case 'ocean':
        switch (tile.biome) {
          case 'deep ocean':
            return '#000080';
          case 'shallow ocean':
            return '#0000CD';
          case 'freezing ocean':
            return '#ADD8E6';
          case 'arctic ocean':
            return '#E0FFFF';
          case 'coral reef':
            return '#5cecff';
          default:
            return '#000000'; // Black as fallback
        }
      case 'land':
        switch (tile.biome) {
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
      default:
        return '#000000'; // Black as fallback
    }
  }

  private _getColorByLithospheric(tile: GameTile): string {
    return this._generatePlateColor(tile.lithosphericPlateId, tile.lithosphericType);
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
