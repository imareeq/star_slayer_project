import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
	title: GameObjects.Text;
	background: GameObjects.Image;
	logo: GameObjects.Image;
	menu: GameObjects.Text;
	option: GameObjects.Text;
	logoTween: Phaser.Tweens.Tween | null;
	private buttons: Phaser.GameObjects.Rectangle[] = [];
	private focusIndex: number = -1;
	private focusIndicator!: Phaser.GameObjects.Rectangle;
	private canvasClickHandler?: (ev: MouseEvent) => void;


	constructor ()
	{
		super('MainMenu');
	}

	create ()
	{
		this.events.once('shutdown', this.cleanup, this);
		this.background = this.add.image(512, 384, 'background');

		const titleText = 'AI Armageddon';

		// Add large text to the scene
		this.title = this.add.text(
		this.cameras.main.centerX, // Center horizontally
		this.cameras.main.centerY - 100, // Position slightly above center vertically
		titleText,
		{
			fontFamily: 'Arial Black', 
			fontSize: 72,
			color: '#ffffff', 
			stroke: '#000000', 
			strokeThickness: 8, 
			align: 'center', 
			shadow: {
			offsetX: 2,
			offsetY: 2,
			color: '#000000',
			blur: 4,
			stroke: true,
			fill: true,
			},
		}
		);

		// Center the text anchor (pivot point)
		this.title.setOrigin(0.5, 0.5);

		// Optional: Add a simple animation (e.g., scale pulse)
		this.tweens.add({
		targets: this.title,
		scale: 1.05,
		duration: 1000,
		yoyo: true, // Makes it scale up and back
		repeat: -1, // Repeat indefinitely
		ease: 'Sine.easeInOut',
		});

		this.menu = this.add.text(512, 435, 'Start', {
			fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
			stroke: '#000000', strokeThickness: 8,
			align: 'center'
		}).setOrigin(0.5).setDepth(100);
		const button1 = this.add.rectangle(512, 435, 300, 55, 0x0070f3)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => this.scene.start('SaveMenu'));

		// this.menu.setInteractive().on("pointerdown", () => {this.scene.start('Game')})

		this.option = this.add.text(512, 535, 'Options', {
			fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
			stroke: '#000000', strokeThickness: 8,
			align: 'center'
		}).setOrigin(0.5).setDepth(100);
		const button2 = this.add.rectangle(512, 535, 300, 55, 0x0070f3)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => this.scene.start('OptionsMenu'));
		
		this.buttons = [button1, button2];

		// Create focus indicator
		this.focusIndicator = this.add.rectangle(0, 0, 310, 65, 0xffff00, 0)
		.setStrokeStyle(2, 0xffff00)
		.setVisible(false)
		.setDepth(10000);

		const canvas = this.game.canvas as HTMLCanvasElement;
		if (canvas) {
		canvas.setAttribute('tabindex', '0');

		// Force focus on scene creation
		canvas.focus();

		// Add click event listener to focus on click (active scene only)
		this.canvasClickHandler = () => { canvas.focus(); console.log('Canvas focused via click (MainMenu)'); };
		canvas.addEventListener('click', this.canvasClickHandler);
		}

		// Handle Tab key
		this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
		event.preventDefault();
		this.focusNextButton();
		});

		// Handle Enter/Space key
		this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
			if (this.focusIndicator.visible && this.focusIndex >= 0 && (event.key === 'Enter' || event.key === " ")) {
				this.buttons[this.focusIndex].emit('pointerdown');
				this.focusIndex = -1;
				this.focusIndicator.setVisible(false);
			}
		});

		// Responsive layout setup
		this.layout();
		this.scale.on('resize', this.layout, this);

		EventBus.emit('current-scene-ready', this);
	}

	private layout = () => {
		const w = this.scale.width;
		const h = this.scale.height;

		// Background fill
		this.background.setPosition(w / 2, h / 2);
		this.background.setDisplaySize(w, h);

		// Keep original relative positions by percentages of 1024x768
		this.title.setPosition(w * 0.5, h * (275/768));
		this.menu.setPosition(w * 0.5, h * (435/768));
		this.buttons[0].setPosition(w * 0.5, h * (435/768));
		this.option.setPosition(w * 0.5, h * (535/768));
		this.buttons[1].setPosition(w * 0.5, h * (535/768));

		// Update focus ring if visible to match button bounds exactly
		if (this.focusIndicator.visible && this.focusIndex >= 0) {
			const btn = this.buttons[this.focusIndex];
			const b = btn.getBounds();
			this.focusIndicator.setSize(b.width, b.height);
			this.focusIndicator.setPosition(b.centerX, b.centerY);
		}
	}

	changeScene ()
    {
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

        this.scene.start('Game');
    }

    moveLogo (reactCallback: ({ x, y }: { x: number, y: number }) => void)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        } 
        else
        {
            this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (reactCallback)
                    {
                        reactCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }
	private focusNextButton() {
		this.focusIndex = (this.focusIndex + 1) % this.buttons.length;
		const button = this.buttons[this.focusIndex];
		const b = button.getBounds();
		this.focusIndicator.setSize(b.width, b.height);
		this.focusIndicator.setPosition(b.centerX, b.centerY).setVisible(true);
	}

	private cleanup() {
		const canvas = this.game.canvas as HTMLCanvasElement;
		if (canvas && this.canvasClickHandler) {
			canvas.removeEventListener('click', this.canvasClickHandler);
			this.canvasClickHandler = undefined;
		}
		this.scale.off('resize', this.layout, this);
	}
}
