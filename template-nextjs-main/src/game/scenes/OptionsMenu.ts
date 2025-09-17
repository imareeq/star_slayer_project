import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class OptionsMenu extends Scene {
	private title!: Phaser.GameObjects.Text;
	private items: { container: Phaser.GameObjects.Container, focusTarget: Phaser.GameObjects.Rectangle }[] = [];
	private focusIndicator!: Phaser.GameObjects.Rectangle;
	private focusIndex: number = -1;
	private backButton!: Phaser.GameObjects.Rectangle;
	private backLabel!: Phaser.GameObjects.Text;
	private masterVolume: number = 1;

	constructor() {
		super('OptionsMenu');
	}

	create() {
		this.events.once('shutdown', this.cleanup, this);

		// Load persisted volume (registry first, then localStorage, fallback to 1)
		const regVol = this.registry.get('masterVolume');
		const lsVol = typeof window !== 'undefined' ? window.localStorage.getItem('masterVolume') : null;
		let initial = typeof regVol === 'number' ? regVol : (lsVol !== null ? parseFloat(lsVol) : 1);
		if (isNaN(initial)) initial = 1;
		this.masterVolume = Phaser.Math.Clamp(initial, 0, 1);
		this.sound.volume = this.masterVolume;
		this.registry.set('masterVolume', this.masterVolume);

		this.createUI();
		this.setupAccessibility();
		this.layout();
		this.scale.on('resize', this.layout, this);

		// Keep focus hidden until user presses Tab
		this.focusIndex = -1;
		this.focusIndicator.setVisible(false);

		EventBus.emit('current-scene-ready', this);
	}

	private createUI() {
		this.title = this.add.text(0, 0, 'Options', {
			fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff', stroke: '#000000', strokeThickness: 8,
		}).setOrigin(0.5);

		// Volume slider placeholder (track + knob)
		this.items.push(this.createSlider('Master Volume', (value) => {
			this.masterVolume = Phaser.Math.Clamp(value, 0, 1);
			this.sound.volume = this.masterVolume; // apply globally
			this.registry.set('masterVolume', this.masterVolume);
			if (typeof window !== 'undefined') {
				window.localStorage.setItem('masterVolume', String(this.masterVolume));
			}
		}));

		// Back button
		this.backButton = this.add.rectangle(0, 0, 200, 56, 0x0070f3)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => this.scene.start('MainMenu'))
			.on('pointerover', () => this.tweens.add({ targets: this.backButton, scale: 1.05, duration: 120 }))
			.on('pointerout', () => this.tweens.add({ targets: this.backButton, scale: 1.0, duration: 120 }));
		this.backLabel = this.add.text(0, 0, 'Back', {
			fontFamily: 'Arial Black', fontSize: 32, color: '#ffffff', stroke: '#000000', strokeThickness: 8,
		}).setOrigin(0.5);

		// Focus indicator
		this.focusIndicator = this.add.rectangle(0, 0, 640, 70, 0xffff00, 0)
			.setStrokeStyle(3, 0xffff00)
			.setVisible(false)
			.setDepth(10000);
	}

	private createSlider(label: string, onChange: (value: number) => void) {
		const container = this.add.container(0, 0);
		const labelText = this.add.text(0, 0, label, {
			fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff', stroke: '#000000', strokeThickness: 6,
		});
		labelText.setOrigin(0, 0.5);

		const track = this.add.rectangle(0, 0, 360, 10, 0xffffff).setOrigin(0, 0.5);
		const knob = this.add.rectangle(0, 0, 24, 24, 0x2d9bf0).setOrigin(0.5);
		const focusTarget = this.add.rectangle(0, 0, 600, 56, 0x000000, 0);

		const updateFromPointer = (p: Phaser.Input.Pointer) => {
			const worldTx = track.getWorldTransformMatrix().tx;
			const localX = Phaser.Math.Clamp(p.x - worldTx, 0, track.width);
			const value = localX / track.width;
			knob.x = track.x + localX;
			onChange(value);
			// Update focus ring while dragging
			if (this.focusIndex === 0) this.updateFocusIndicator();
		};

		focusTarget.setInteractive({ useHandCursor: true })
			.on('pointerdown', (p: Phaser.Input.Pointer) => {
				updateFromPointer(p);
				isDragging = true;
			})
			.on('pointerover', () => this.tweens.add({ targets: knob, scale: 1.1, duration: 120 }))
			.on('pointerout', () => this.tweens.add({ targets: knob, scale: 1.0, duration: 120 }));

		let isDragging = false;
		this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
			if (isDragging) {
				updateFromPointer(p);
			}
		});
		this.input.on('pointerup', () => {
			isDragging = false;
		});

		container.add([focusTarget, labelText, track, knob]);
		return { container, focusTarget };
	}

	private setupAccessibility() {
		const canvas = this.game.canvas as HTMLCanvasElement;
		if (canvas) {
			canvas.setAttribute('tabindex', '0');
			canvas.focus();
			canvas.addEventListener('click', () => canvas.focus());
		}

		this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
			event.preventDefault();
			this.focusNext();
		});

		this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
				// Adjust slider when focused on first item (slider)
				if (this.focusIndex === 0) {
					const step = 0.05 * (event.key === 'ArrowLeft' ? -1 : 1);
					this.masterVolume = Phaser.Math.Clamp(this.masterVolume + step, 0, 1);
					this.sound.volume = this.masterVolume;
					this.registry.set('masterVolume', this.masterVolume);
					if (typeof window !== 'undefined') {
						window.localStorage.setItem('masterVolume', String(this.masterVolume));
					}
					this.updateSliderKnobVisual();
					this.updateFocusIndicator();
				}
			}

			if (!this.focusIndicator.visible || this.focusIndex < 0) return;
			if (event.key === 'Enter' || event.key === ' ') {
				if (this.focusIndex === this.items.length) {
					this.backButton.emit('pointerdown');
				} else {
					this.items[this.focusIndex].focusTarget.emit('pointerdown');
				}
			}
		});
	}

	private layout = () => {
		const w = this.scale.width;
		const h = this.scale.height;

		this.title.setPosition(w / 2, h * 0.12);

		const contentWidth = Math.min(w * 0.8, 700);
		const startX = (w - contentWidth) / 2;
		let y = h * 0.25;
		const vGap = Math.min(80, h * 0.12);

		this.items.forEach(({ container }) => {
			container.x = startX;
			container.y = y;
			const [focusTarget, labelText, trackOrBox, knobOrTick] = container.list as any[];

			// Position elements inside rows
			(focusTarget as Phaser.GameObjects.Rectangle).setSize(contentWidth, 56).setOrigin(0, 0.5);
			(labelText as Phaser.GameObjects.Text).setPosition(0, 0);

			if (trackOrBox instanceof Phaser.GameObjects.Rectangle && (trackOrBox as any).height === 10) {
				// Slider
				trackOrBox.x = contentWidth - 380;
				trackOrBox.y = 0;
				(knobOrTick as Phaser.GameObjects.Rectangle).x = trackOrBox.x + trackOrBox.width * this.masterVolume;
				(knobOrTick as Phaser.GameObjects.Rectangle).y = 0;
			} else {
				// Toggle (not used now but kept for layout resilience)
				trackOrBox.x = contentWidth - 60;
				trackOrBox.y = 0;
				(knobOrTick as Phaser.GameObjects.Rectangle).x = contentWidth - 50;
				(knobOrTick as Phaser.GameObjects.Rectangle).y = 0;
			}

			y += vGap;
		});

		this.backButton.setPosition(w / 2, h * 0.88);
		this.backLabel.setPosition(this.backButton.x, this.backButton.y);

		if (this.focusIndicator.visible) {
			this.updateFocusIndicator();
		}
	}

	private focusNext() {
		const total = this.items.length + 1; // include back button
		this.focusIndex = (this.focusIndex + 1) % total;
		this.updateFocusIndicator();
	}

	private getFocusedTarget(): Phaser.GameObjects.Rectangle | null {
		if (this.focusIndex < 0) return null;
		if (this.focusIndex === this.items.length) return this.backButton;
		return this.items[this.focusIndex].focusTarget;
	}

	private updateFocusIndicator() {
		const target = this.getFocusedTarget();
		if (!target) {
			this.focusIndicator.setVisible(false);
			return;
		}
		// Use world-space bounds so containers do not offset the ring
		const bounds = target.getBounds();
		const margin = 10;
		const width = bounds.width + margin;
		const height = bounds.height + margin;
		this.focusIndicator.setSize(width, height);
		this.focusIndicator.setPosition(bounds.centerX, bounds.centerY).setVisible(true);
	}

	private updateSliderKnobVisual() {
		// Assumes first item is the slider
		if (this.items.length === 0) return;
		const [focusTarget, _label, track, knob] = this.items[0].container.list as any[];
		if (!(track instanceof Phaser.GameObjects.Rectangle) || !(knob instanceof Phaser.GameObjects.Rectangle)) return;
		knob.x = track.x + track.width * this.masterVolume;
	}

	private cleanup() {
		if (this.title) this.title.destroy();
		this.items.forEach(({ container }) => container.destroy());
		this.items.length = 0;
		if (this.backButton) this.backButton.destroy();
		if (this.backLabel) this.backLabel.destroy();
		if (this.focusIndicator) this.focusIndicator.destroy();
		this.scale.off('resize', this.layout, this);
		this.input.keyboard?.removeAllListeners();
		this.input.removeAllListeners();
	}
} 