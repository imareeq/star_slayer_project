import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    menu: GameObjects.Text;
    setting: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    private buttons: Phaser.GameObjects.Rectangle[] = [];
    private focusIndex: number = -1;
    private focusIndicator!: Phaser.GameObjects.Rectangle;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background');

        this.logo = this.add.image(512, 300, 'logo').setDepth(100);

        this.menu = this.add.text(512, 435, 'Start', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        const button1 = this.add.rectangle(512, 435, 300, 55, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('SaveMenu'));

        // this.menu.setInteractive().on("pointerdown", () => {this.scene.start('Game')})

        this.setting = this.add.text(512, 535, 'Settings', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        const button2 = this.add.rectangle(512, 535, 300, 55, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('GameOver'));
        
        this.buttons = [button1, button2];

        // Create focus indicator
        this.focusIndicator = this.add.rectangle(0, 0, 310, 65, 0xffff00, 0)
        .setStrokeStyle(2, 0xffff00)
        .setVisible(false);

        const canvas = this.game.canvas as HTMLCanvasElement;
        if (canvas) {
        canvas.setAttribute('tabindex', '0');

        // Force focus on scene creation
        canvas.focus();
        console.log('Canvas focused programmatically');

        // Add click event listener to focus on click
        canvas.addEventListener('click', () => {
            canvas.focus();
            console.log('Canvas focused via click');
        });
        }

        // Handle Tab key
        this.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
        event.preventDefault();
        this.focusNextButton();
        });

        // Handle Enter/Space key
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            // console.log(`Key pressed: "${event.key}"`);
            // console.log("Is this working?")
            if (this.focusIndicator.visible && this.focusIndex >= 0 && (event.key === 'Enter' || event.key === " ")) {
                this.buttons[this.focusIndex].emit('pointerdown');
                this.focusIndex = -1;
                this.focusIndicator.setVisible(false);
            }
        });

    
        
        EventBus.emit('current-scene-ready', this);
    }

    private focusNextButton() {
        this.focusIndex = (this.focusIndex + 1) % this.buttons.length;
        const button = this.buttons[this.focusIndex];
        this.focusIndicator.setPosition(button.x, button.y).setVisible(true);
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
            this.logoTween = this.tweens.add({
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
}
