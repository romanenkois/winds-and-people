import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameWindow } from './main/game-window/game-window';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GameWindow],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
