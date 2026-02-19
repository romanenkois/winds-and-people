import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  effect,
  inject,
  OnDestroy,
  computed,
} from '@angular/core';
import { KeyValuePipe } from '@angular/common';

import { GameSceneService } from '../game-core/game-scene.service';
import { MapType } from '@angular/compiler';

@Component({
  selector: 'app-game-window',
  imports: [KeyValuePipe],
  templateUrl: './game-window.html',
  styleUrls: ['./game-window.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GameSceneService],
})
export class GameWindow implements OnDestroy {
  private gameSceneService = inject(GameSceneService);
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  protected tileInfo = this.gameSceneService.clickedTile;

  protected tileDetails = computed(() => {
    const tile = this.tileInfo();
    if (!tile) return {};

    const flatten = (obj: any, prefix = ''): Record<string, any> => {
      const result: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          const newKey = prefix ? `${prefix}.${key}` : key;

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flatten(value, newKey));
          } else {
            result[newKey] = Array.isArray(value)
              ? value.length
                ? value.join(', ')
                : '[]'
              : value;
          }
        }
      }
      return result;
    };

    return flatten(tile);
  });

  protected mapTypes: MapType[] = [];

  constructor() {
    effect(() => {
      const canvas = this.canvasRef().nativeElement;
      this.gameSceneService.init(canvas);

      this.setupEventListeners(canvas);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize);
    const canvas = this.canvasRef()?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('click', this.onCanvasClick);
    }
  }

  private setupEventListeners(canvas: HTMLCanvasElement): void {
    window.addEventListener('resize', this.onWindowResize);
    canvas.addEventListener('click', this.onCanvasClick);
  }

  private onWindowResize = (): void => {
    this.gameSceneService.onWindowResize();
  };

  private onCanvasClick = (event: MouseEvent): void => {
    this.gameSceneService.onCanvasClick(event);
  };
}
