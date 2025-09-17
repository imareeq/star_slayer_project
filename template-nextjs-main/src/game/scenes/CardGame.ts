import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class CardGame extends Scene {
    background: GameObjects.Image;
    private buttons: Phaser.GameObjects.Rectangle[] = [];
    private focusIndex: number = -1;
    private focusIndicator!: Phaser.GameObjects.Rectangle;
    private canvasClickHandler?: (ev: MouseEvent) => void;
    private cutsceneOverlay!: Phaser.GameObjects.Rectangle;
    private cutsceneText!: Phaser.GameObjects.Text;
    private cutsceneIndex: number = 0;
    private cutsceneLines: string[] = [
        "You and Sidekick wander into an abandoned BANK",
        `in search of Sidekick's missing memory chip,\n 
        following a lead on his radar.`,
        "",
        `Upon arrival, sidekick's radar homes in on a vault,\n
        guarded by (evil org character). Luckily, he is sleeping.`,
        "",
        `Unlock the vault and steal the component inside,\n
        without waking up the guard.`,
        "",
        `The vault will start ringing if too many",\n
        incorrect attempts are made.`,
        "",
        "Click to begin..."
    ];

    private settingsButton!: Phaser.GameObjects.Rectangle;
    private settingsText!: Phaser.GameObjects.Text;
    private pauseOverlay!: Phaser.GameObjects.Rectangle;
    private pauseMenu!: Phaser.GameObjects.Container;
    private isPaused: boolean = false;

    constructor() {
        super('CardGame');
    }

    preload() {
        this.load.image('cardgame-bg', 'assets/card_game/card_lore_bg.png');
    }

    create() {
        this.cutsceneIndex = 0;
        this.events.once('shutdown', this.cleanup, this);
        this.background = this.add.image(512, 384, 'cardgame-bg');

        // Create settings button
        this.createSettingsButton();

        // Create focus indicator
        this.focusIndicator = this.add.rectangle(0, 0, 310, 65, 0xffff00, 0)
            .setStrokeStyle(2, 0xffff00)
            .setVisible(false)
            .setDepth(10000);

        const canvas = this.game.canvas as HTMLCanvasElement;
        if (canvas) {
            canvas.setAttribute('tabindex', '0');
            canvas.focus();
            this.canvasClickHandler = () => {
                canvas.focus();
                console.log('Canvas focused via click (CardGame)');
            };
            canvas.addEventListener('click', this.canvasClickHandler);
        }

        // Handle Q key for pause menu
        this.input.keyboard?.on('keydown-Q', () => {
            this.togglePauseMenu();
        });

        // Responsive layout
        this.layout();
        this.scale.on('resize', this.layout, this);

        // Start cutscene
        this.startCutscene();

        EventBus.emit('current-scene-ready', this);
    }

    private createSettingsButton() {
        this.settingsButton = this.add.rectangle(0, 0, 80, 40, 0x333333)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.togglePauseMenu())
            .on('pointerover', () => this.settingsButton.setFillStyle(0x444444))
            .on('pointerout', () => this.settingsButton.setFillStyle(0x333333))
            .setDepth(10001);

        this.settingsText = this.add.text(0, 0, 'Settings', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(10002);
    }

    private createPauseMenu() {
        // Semi-transparent overlay
        this.pauseOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.5)
            .setOrigin(0, 0)
            .setDepth(15000);

        // Menu container
        this.pauseMenu = this.add.container(this.scale.width / 2, this.scale.height / 2);
        this.pauseMenu.setDepth(15001);

        // Menu background
        const menuBg = this.add.rectangle(0, 0, 300, 200, 0x222222)
            .setStrokeStyle(2, 0xffffff);
        this.pauseMenu.add(menuBg);

        // Menu title
        const title = this.add.text(0, -70, 'Pause Menu', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.pauseMenu.add(title);

        // Resume button
        const resumeBtn = this.add.rectangle(0, -20, 200, 40, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.togglePauseMenu());
        this.pauseMenu.add(resumeBtn);

        const resumeText = this.add.text(0, -20, 'Resume', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.pauseMenu.add(resumeText);

        // Restart button
        const restartBtn = this.add.rectangle(0, 30, 200, 40, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.restartScene());
        this.pauseMenu.add(restartBtn);

        const restartText = this.add.text(0, 30, 'Restart', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.pauseMenu.add(restartText);

        // Level Select button
        const levelSelectBtn = this.add.rectangle(0, 80, 200, 40, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('LevelSelect'))
        this.pauseMenu.add(levelSelectBtn);

        const levelSelectText = this.add.text(0, 80, 'Level Select', {
            fontFamily: 'Arial Black',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.pauseMenu.add(levelSelectText);
    }

    private togglePauseMenu() {
        if (this.isPaused) {
            // Hide pause menu
            this.pauseOverlay.destroy();
            this.pauseMenu.destroy();
            this.isPaused = false;
        } else {
            // Show pause menu
            this.createPauseMenu();
            this.isPaused = true;
        }
    }

    private restartScene() {
        this.isPaused = false;
        this.cutsceneIndex = 0;
        this.scene.restart();
    }

    private startCutscene() {
        // Create grayed overlay
        this.cutsceneOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
            .setOrigin(0, 0)
            .setDepth(5000);

        // Create text display
        this.cutsceneText = this.add.text(this.scale.width / 2, this.scale.height / 2, '', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
            wordWrap: { width: this.scale.width * 0.8 }
        }).setOrigin(0.5).setDepth(5001);

        // Show first line
        this.showCutsceneLine();

        // Handle clicks to advance
        this.input.on('pointerdown', this.advanceCutscene, this);
    }

    private showCutsceneLine() {
        if (this.cutsceneIndex < this.cutsceneLines.length) {
            this.cutsceneText.setText(this.cutsceneLines[this.cutsceneIndex]);
        }
    }

    private advanceCutscene = () => {
        // Don't advance cutscene if paused
        if (this.isPaused) return;

        this.cutsceneIndex++;
        if (this.cutsceneIndex >= this.cutsceneLines.length) {
            // End cutscene
            this.endCutscene();
        } else {
            this.showCutsceneLine();
        }
    };

    private endCutscene() {
        this.cutsceneOverlay.destroy();
        this.cutsceneText.destroy();
        this.input.off('pointerdown', this.advanceCutscene, this);
        // Game logic starts here
    }

    private layout = () => {
        const w = this.scale.width;
        const h = this.scale.height;

        const scaleX = Math.floor(w / this.background.width);
        const scaleY = Math.floor(h / this.background.height);
        const scale = Math.min(scaleX, scaleY);
        console.log("scale of background %d\n", scale);

        this.background.setScale(scale);
        this.background.setPosition(w / 2, h / 2);

        // Position settings button in top right
        this.settingsButton.setPosition(w - 50, 30);
        this.settingsText.setPosition(w - 50, 30);

        // Update cutscene elements if they exist
        if (this.cutsceneOverlay && this.cutsceneOverlay.active) {
            this.cutsceneOverlay.setSize(w, h);
            this.cutsceneText.setPosition(w / 2, h / 2);
            this.cutsceneText.setStyle({ wordWrap: { width: w * 0.8 } });
        }

        // Update pause menu if it exists
        if (this.pauseOverlay && this.pauseOverlay.active) {
            this.pauseOverlay.setSize(w, h);
            this.pauseMenu.setPosition(w / 2, h / 2);
        }
    };

    private focusNextButton() {
        this.focusIndex = (this.focusIndex + 1) % this.buttons.length;
        const button = this.buttons[this.focusIndex];
        const b = button.getBounds();
        this.focusIndicator
            .setSize(b.width, b.height)
            .setPosition(b.centerX, b.centerY)
            .setVisible(true);
    }

    private cleanup() {
        const canvas = this.game.canvas as HTMLCanvasElement;
        if (canvas && this.canvasClickHandler) {
            canvas.removeEventListener('click', this.canvasClickHandler);
            this.canvasClickHandler = undefined;
        }
        this.endCutscene();
        this.isPaused = false;
        this.cutsceneIndex = 0;
        this.scale.off('resize', this.layout, this);
        this.input.off('pointerdown', this.advanceCutscene, this);
        this.input.keyboard?.off('keydown-Q');
    }
}
