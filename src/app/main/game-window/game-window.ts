import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  effect,
  inject,
  OnDestroy,
} from '@angular/core';
import { GameSceneService } from '../game-core/game-scene.service';
import { KeyValuePipe } from '@angular/common';

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
