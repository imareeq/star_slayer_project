import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class LevelSelect extends Scene {
	private levelButtons: Phaser.GameObjects.Rectangle[] = [];
	private levelLabels: Phaser.GameObjects.Text[] = [];
	private focusIndicator!: Phaser.GameObjects.Rectangle;
	private focusIndex: number = -1;
	private title!: Phaser.GameObjects.Text;
	private backButton!: Phaser.GameObjects.Rectangle;
	private backLabel!: Phaser.GameObjects.Text;

	constructor() {
		super('LevelSelect');
	}

	create() {
        this.events.once('shutdown', this.cleanup, this);

        this.createUI();
        this.setupAccessibility();
		this.layout();

		// Re-layout on resize
		this.scale.on('resize', this.layout, this);

		EventBus.emit('current-scene-ready', this);
	}

	private createUI() {
		this.title = this.add.text(0, 0, 'Level Select', {
			fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff', stroke: '#000000', strokeThickness: 8,
		}).setOrigin(0.5);

		// Create a grid of placeholder level buttons (rectangles)
		const totalLevels = 9;
		for (let i = 0; i < totalLevels; i++) {
			const rect = this.add.rectangle(0, 0, 140, 90, 0x2d9bf0)
				.setInteractive({ useHandCursor: true })
				.on('pointerdown', () => this.startLevel(i + 1))
			this.levelButtons.push(rect);

			const label = this.add.text(0, 0, `L${i + 1}`, {
				fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff', stroke: '#000000', strokeThickness: 6,
			}).setOrigin(0.5);
			this.levelLabels.push(label);
		}

		// Focus indicator
		this.focusIndicator = this.add.rectangle(0, 0, 150, 100, 0xffff00, 0)
			.setStrokeStyle(3, 0xffff00)
			.setVisible(false)
			.setDepth(10000);

		// Back button
		this.backButton = this.add.rectangle(0, 0, 180, 56, 0x0070f3)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => this.scene.start('MainMenu'))
		this.backLabel = this.add.text(0, 0, 'Back', {
			fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff', stroke: '#000000', strokeThickness: 8,
		}).setOrigin(0.5);
	}

	private setupAccessibility() {
		const canvas = this.game.canvas as HTMLCanvasElement;
		if (canvas) {
			canvas.setAttribute('tabindex', '0');
			canvas.focus();
			canvas.addEventListener('click', () => canvas.focus());
		}

		// Cycle focus with Tab
		this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
			event.preventDefault();
			this.focusNext();
		});

		// Activate with Enter/Space
		this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
			if (!this.focusIndicator.visible || this.focusIndex < 0) return;
			if (event.key === 'Enter' || event.key === ' ') {
				if (this.focusIndex === this.levelButtons.length) {
					this.backButton.emit('pointerdown');
				} else {
					this.levelButtons[this.focusIndex].emit('pointerdown');
				}
			}
		});
	}

	private layout = () => {
		const w = this.scale.width;
		const h = this.scale.height;
        console.log("weight: %d\n",w);
        console.log("height: %d\n",h);

		this.title.setPosition(w / 2, h * 0.12);

		// Grid layout for level buttons
		const cols = 3;
		const rows = Math.ceil(this.levelButtons.length / cols);
		const gridWidth = Math.min(w * 0.8, 700);
		const gridHeight = Math.min(h * 0.55, 400);
		const cellW = gridWidth / cols;
		const cellH = gridHeight / rows;
		const startX = (w - gridWidth) / 2 + cellW / 2;
		const startY = h * 0.22 + cellH / 2;

        console.log("rows %d\n", rows);
        console.log("start y: %d\n",startY);
        console.log("cellH %d\n",cellH);
        console.log("grid Height %d\n", gridHeight);

		this.levelButtons.forEach((btn, i) => {
			const cx = i % cols;
			const cy = Math.floor(i / cols);
            console.log("%d button width %d height %d\n",i,startX + cx * cellW, startY + cy * cellH);
			btn.setPosition(startX + cx * cellW, startY + cy * cellH);
            btn.setVisible(true);
			this.levelLabels[i].setPosition(btn.x, btn.y);
            this.levelLabels[i].setVisible(true);
		});

		this.backButton.setPosition(w / 2, h * 0.88);
		this.backLabel.setPosition(this.backButton.x, this.backButton.y);

		// Update focus ring to match target bounds exactly
		if (this.focusIndicator.visible && this.focusIndex >= 0) {
			const target = this.getFocusedTarget();
			if (target) {
				const b = target.getBounds();
				this.focusIndicator.setSize(b.width, b.height);
				this.focusIndicator.setPosition(b.centerX, b.centerY);
			}
		}
	}

	private startLevel(levelNumber: number) {
		// Placeholder: start the core game scene
        console.log("levelNumber %d\n", levelNumber);
        if (levelNumber == 1) {
            console.log("Tiggered right\n");
            this.scene.start('CardGame');
        } else {
            this.scene.start('MainMenu');
        }
	}

	private focusNext() {
		// Include back button as the last focusable element
		const total = this.levelButtons.length + 1;
		this.focusIndex = (this.focusIndex + 1) % total;
		const target = this.getFocusedTarget();
		if (!target) return;
		const b = target.getBounds();
		this.focusIndicator.setSize(b.width, b.height);
		this.focusIndicator.setPosition(b.centerX, b.centerY).setVisible(true);
	}

	private getFocusedTarget(): Phaser.GameObjects.Rectangle | null {
		if (this.focusIndex < 0) return null;
		if (this.focusIndex === this.levelButtons.length) return this.backButton;
		return this.levelButtons[this.focusIndex];
	}

    private cleanup() {
        this.levelButtons.forEach(btn => btn.destroy());
        this.levelLabels.forEach(label => label.destroy());
        this.levelButtons.length = 0;
        this.levelLabels.length = 0;
        if (this.title) this.title.destroy();
        if (this.backButton) this.backButton.destroy();
        if (this.backLabel) this.backLabel.destroy();
        if (this.focusIndicator) this.focusIndicator.destroy();
        this.scale.off('resize', this.layout, this);
        this.input.keyboard?.removeAllListeners();
    }
} 