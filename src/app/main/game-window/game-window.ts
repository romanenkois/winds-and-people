import { Component, ChangeDetectionStrategy, ElementRef, viewChild, effect } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-game-window',
  imports: [],
  templateUrl: './game-window.html',
  styleUrl: './game-window.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameWindow {
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private sphere!: THREE.Mesh;
  private controls!: OrbitControls;
  private animationId?: number;

  constructor() {
    effect(() => {
      const canvas = this.canvasRef().nativeElement;
      this.initThreeJS(canvas);
      this.animate();
    });
  }

  private initThreeJS(canvas: HTMLCanvasElement): void {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Create sphere geometry
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);

    // Create material with wireframe
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true,
    });

    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);

    // Add lighting
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(5, 5, 5);
    this.scene.add(light);

    // Setup orbit controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update controls for damping and auto-rotation
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    const canvas = this.canvasRef().nativeElement;
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', () => this.onWindowResize());
    this.controls.dispose();
    this.renderer.dispose();
  }
}
