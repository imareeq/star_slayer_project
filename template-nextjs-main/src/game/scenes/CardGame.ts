import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class CardGame extends Scene
{
    background: GameObjects.Image;
    title: GameObjects.Text;
    save1: GameObjects.Text;
    setting: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    private buttons: Phaser.GameObjects.Rectangle[] = [];
    private focusIndex: number = -1;
    private focusIndicator!: Phaser.GameObjects.Rectangle;
    private canvasClickHandler?: (ev: MouseEvent) => void;

    constructor ()
    {
        super('CardGame');
    }

    create ()
    {
        this.events.once('shutdown', this.cleanup, this);
        this.background = this.add.image(512, 384, 'background');

        // this.logo = this.add.image(512, 300, 'logo').setDepth(100);

        this.title = this.add.text(512, 150, 'Save', {
            fontFamily: 'Arial Black', fontSize: 72, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);


        this.save1 = this.add.text(512, 435, 'Start', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        const savebutton1 = this.add.rectangle(512, 435, 300, 400, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('Game'));

        // this.menu.setInteractive().on("pointerdown", () => {this.scene.start('Game')})

        this.setting = this.add.text(125, 75, 'Back', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        const backbutton = this.add.rectangle(125, 75, 200, 55, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('MainMenu'));
        
        this.buttons = [backbutton, savebutton1];

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
        this.canvasClickHandler = () => { canvas.focus(); console.log('Canvas focused via click (CardGame)'); };
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

        // Responsive layout
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

        // Positions relative to 1024x768 design
        this.title.setPosition(w * (512/1024), h * (150/768));
        this.save1.setPosition(w * 0.5, h * (435/768));
        this.buttons[1].setPosition(w * 0.5, h * (435/768));
        this.setting.setPosition(w * (125/1024), h * (75/768));
        this.buttons[0].setPosition(w * (125/1024), h * (75/768));

        // Update focus ring
        if (this.focusIndicator.visible && this.focusIndex >= 0) {
            const b = this.buttons[this.focusIndex].getBounds();
            this.focusIndicator.setSize(b.width, b.height);
            this.focusIndicator.setPosition(b.centerX, b.centerY);
        }
    }

    private focusNextButton() {
        this.focusIndex = (this.focusIndex + 1) % this.buttons.length;
        const button = this.buttons[this.focusIndex];
        const b = button.getBounds();
        this.focusIndicator.setSize(b.width, b.height)
        this.focusIndicator.setPosition(b.centerX, b.centerY).setVisible(true);
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

    private cleanup() {
        const canvas = this.game.canvas as HTMLCanvasElement;
        if (canvas && this.canvasClickHandler) {
            canvas.removeEventListener('click', this.canvasClickHandler);
            this.canvasClickHandler = undefined;
        }
        this.scale.off('resize', this.layout, this);
    }
}
