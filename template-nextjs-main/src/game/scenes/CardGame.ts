import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

import { createCard, CardObject } from "../createCard";

interface GridConfiguration {
    x: number;
    y: number;
    paddingX: number;
    paddingY: number;
}


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
    // Cards Game Objects
    private cardOpened?: CardObject;
    private cards: CardObject[] = [];
    private canMove: boolean = false;
    private lives: number = 3; // Assuming a default value; adjust as needed
    private cardNames: string[] = ["card-0", "card-1", "card-2", "card-3", "card-4", "card-5"]; // Populate with actual card names
    private gridConfiguration: GridConfiguration = {
        x: 0,
        y: 0,
        paddingX: 10,
        paddingY: 10
    };

    init ()
    {
        this.cameras.main.fadeIn(500);
        this.lives = 5;
    }

    constructor() {
        super('CardGame');
    }

    preload() {
        this.load.setPath("assets/card_game/");

        // this.load.image("volume-icon", "ui/volume-icon.png");
        // this.load.image("volume-icon_off", "ui/volume-icon_off.png");

        // this.load.audio("theme-song", "audio/fat-caps-audionatix.mp3");
        // this.load.audio("whoosh", "audio/whoosh.mp3");
        // this.load.audio("card-flip", "audio/card-flip.mp3");
        // this.load.audio("card-match", "audio/card-match.mp3");
        // this.load.audio("card-mismatch", "audio/card-mismatch.mp3");
        // this.load.audio("card-slide", "audio/card-slide.mp3");
        // this.load.audio("victory", "audio/victory.mp3");
        this.load.image('cardgame-bg', 'card_lore_bg.png');
        this.load.image("minigame-background", "card_minigame_bg.png");
        this.load.image("card-back", "card_unopened.png");
        this.load.image("card-0", "./card_faces/face_1.png");
        this.load.image("card-1", "./card_faces/face_2.png");
        this.load.image("card-2", "./card_faces/face_3.png");
        this.load.image("card-3", "./card_faces/face_4.png");
        this.load.image("card-4", "./card_faces/face_5.png");
        this.load.image("card-5", "./card_faces/face_6.png");
        this.load.image("card-6", "./card_faces/face_7.png");
        this.load.image("card-7", "./card_faces/face_8.png");
        this.load.image("heart", "pixel_heart.png");
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
        // this.startGame();
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

    // restartGame ()
    // {
    //     this.cardOpened = undefined;
    //     this.cameras.main.fadeOut(200 * this.cards.length);
    //     this.cards.reverse().map((card, index) => {
    //         this.add.tween({
    //             targets: card.gameObject,
    //             duration: 500,
    //             y: 1000,
    //             delay: index * 100,
    //             onComplete: () => {
    //                 card.gameObject.destroy();
    //             }
    //         })
    //     });

    //     this.time.addEvent({
    //         delay: 200 * this.cards.length,
    //         callback: () => {
    //             this.cards = [];
    //             this.canMove = false;
    //             this.scene.restart();
    //             // this.sound.play("card-slide", { volume: 1.2 });
    //         }
    //     })
    // }

    // createGridCards ()
    // {
    //     // Phaser random array position
    //     const gridCardNames = Phaser.Utils.Array.Shuffle([...this.cardNames, ...this.cardNames]);

    //     return gridCardNames.map((name, index) => {
    //         const newCard = createCard({
    //             scene: this,
    //             x: this.gridConfiguration.x + (98 + this.gridConfiguration.paddingX) * (index % 4),
    //             y: -1000,
    //             frontTexture: name,
    //             cardName: name
    //         });
    //         this.add.tween({
    //             targets: newCard.gameObject,
    //             duration: 800,
    //             delay: index * 100,
    //             // onStart: () => this.sound.play("card-slide", { volume: 1.2 }),
    //             y: this.gridConfiguration.y + (128 + this.gridConfiguration.paddingY) * Math.floor(index / 4)
    //         })
    //         return newCard;
    //     });
    // }

    // createHearts ()
    // {
    //     return Array.from(new Array(this.lives)).map((el, index) => {
    //         const heart = this.add.image(this.sys.game.scale.width + 1000, 20, "heart")
    //             .setScale(2)

    //         this.add.tween({
    //             targets: heart,
    //             ease: Phaser.Math.Easing.Expo.InOut,
    //             duration: 1000,
    //             delay: 1000 + index * 200,
    //             x: 140 + 30 * index // marginLeft + spaceBetween * index
    //         });
    //         return heart;
    //     });
    // }


    // volumeButton ()
    // {
    //     // const volumeIcon = this.add.image(25, 25, "volume-icon").setName("volume-icon");
    //     // volumeIcon.setInteractive();

    //     // Mouse enter
    //     // volumeIcon.on(Phaser.Input.Events.POINTER_OVER, () => {
    //     //     this.input.setDefaultCursor("pointer");
    //     // });
    //     // // Mouse leave
    //     // volumeIcon.on(Phaser.Input.Events.POINTER_OUT, () => {
    //     //     console.log("Mouse leave");
    //     //     this.input.setDefaultCursor("default");
    //     // });


    //     // volumeIcon.on(Phaser.Input.Events.POINTER_DOWN, () => {
    //     //     if (this.sound.volume === 0) {
    //     //         this.sound.setVolume(1);
    //     //         volumeIcon.setTexture("volume-icon");
    //     //         volumeIcon.setAlpha(1);
    //     //     } else {
    //     //         this.sound.setVolume(0);
    //     //         volumeIcon.setTexture("volume-icon_off");
    //     //         volumeIcon.setAlpha(.5)
    //     //     }
    //     // });
    // }

    // startGame ()
    // {

    //     // WinnerText and GameOverText
    //     const winnerText = this.add.text(this.sys.game.scale.width / 2, -1000, "YOU WIN",
    //         { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#8c7ae6" }
    //     ).setOrigin(.5)
    //         .setDepth(3)
    //         .setInteractive();

    //     const gameOverText = this.add.text(this.sys.game.scale.width / 2, -1000,
    //         "GAME OVER\nClick to restart",
    //         { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#ff0000" }
    //     )
    //         .setName("gameOverText")
    //         .setDepth(3)
    //         .setOrigin(.5)
    //         .setInteractive();

    //     // Start lifes images
    //     const hearts = this.createHearts();

    //     // Create a grid of cards
    //     this.cards = this.createGridCards();

    //     // Start canMove
    //     this.time.addEvent({
    //         delay: 200 * this.cards.length,
    //         callback: () => {
    //             this.canMove = true;
    //         }
    //     });

    //     // Game Logic
    //     this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
    //         if (this.canMove) {
    //             const card = this.cards.find(card => card.gameObject.hasFaceAt(pointer.x, pointer.y));
    //             if (card) {
    //                 this.input.setDefaultCursor("pointer");
    //             } else {
    //                 this.input.setDefaultCursor("default");
    //             }
    //         }
    //     });
    //     this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
    //         if (this.canMove && this.cards.length) {
    //             const card = this.cards.find(card => card.gameObject.hasFaceAt(pointer.x, pointer.y));

    //             if (card) {
    //                 this.canMove = false;

    //                 // Detect if there is a card opened
    //                 if (this.cardOpened !== undefined) {
    //                     // If the card is the same that the opened not do anything
    //                     if (this.cardOpened?.gameObject.x === card.gameObject.x && this.cardOpened?.gameObject.y === card.gameObject.y) {
    //                         this.canMove = true;
    //                         return false;
    //                     }

    //                     card.flip(() => {
    //                         if (this.cardOpened?.cardName === card.cardName) {
    //                             // ------- Match -------
    //                             // this.sound.play("card-match");
    //                             // Destroy card selected and card opened from history
    //                             this.cardOpened?.destroy();
    //                             card.destroy();

    //                             // remove card destroyed from array
    //                             this.cards = this.cards.filter(cardLocal => cardLocal.cardName !== card.cardName);
    //                             // reset history card opened
    //                             this.cardOpened = undefined;
    //                             this.canMove = true;

    //                         } else {
    //                             // ------- No match -------
    //                             // this.sound.play("card-mismatch");
    //                             this.cameras.main.shake(600, 0.01);
    //                             // remove life and heart
    //                             const lastHeart = hearts[hearts.length - 1];
    //                             this.add.tween({
    //                                 targets: lastHeart,
    //                                 ease: Phaser.Math.Easing.Expo.InOut,
    //                                 duration: 1000,
    //                                 y: - 1000,
    //                                 onComplete: () => {
    //                                     lastHeart.destroy();
    //                                     hearts.pop();
    //                                 }
    //                             });
    //                             this.lives -= 1;
    //                             // Flip last card selected and flip the card opened from history and reset history
    //                             card.flip();
    //                             this.cardOpened?.flip(() => {
    //                                 this.cardOpened = undefined;
    //                                 this.canMove = true;

    //                             });
    //                         }

    //                         // Check if the game is over
    //                         if (this.lives === 0) {
    //                             // Show Game Over text
    //                             // this.sound.play("whoosh", { volume: 1.3 });
    //                             this.add.tween({
    //                                 targets: gameOverText,
    //                                 ease: Phaser.Math.Easing.Bounce.Out,
    //                                 y: this.sys.game.scale.height / 2,
    //                             });

    //                             this.canMove = false;
    //                         }

    //                         // Check if the game is won
    //                         if (this.cards.length === 0) {
    //                             // this.sound.play("whoosh", { volume: 1.3 });
    //                             // this.sound.play("victory");

    //                             this.add.tween({
    //                                 targets: winnerText,
    //                                 ease: Phaser.Math.Easing.Bounce.Out,
    //                                 y: this.sys.game.scale.height / 2,
    //                             });
    //                             this.canMove = false;
    //                         }
    //                     });

    //                 } else if (this.cardOpened === undefined && this.lives > 0 && this.cards.length > 0) {
    //                     // If there is not a card opened save the card selected
    //                     card.flip(() => {
    //                         this.canMove = true;
    //                     });
    //                     this.cardOpened = card;
    //                 }
    //             }
    //         }

    //     });


    //     // Text events
    //     winnerText.on(Phaser.Input.Events.POINTER_OVER, () => {
    //         winnerText.setColor("#FF7F50");
    //         this.input.setDefaultCursor("pointer");
    //     });
    //     winnerText.on(Phaser.Input.Events.POINTER_OUT, () => {
    //         winnerText.setColor("#8c7ae6");
    //         this.input.setDefaultCursor("default");
    //     });
    //     winnerText.on(Phaser.Input.Events.POINTER_DOWN, () => {
    //         // this.sound.play("whoosh", { volume: 1.3 });
    //         this.add.tween({
    //             targets: winnerText,
    //             ease: Phaser.Math.Easing.Bounce.InOut,
    //             y: -1000,
    //             onComplete: () => {
    //                 this.restartGame();
    //             }
    //         })
    //     });

    //     gameOverText.on(Phaser.Input.Events.POINTER_OVER, () => {
    //         gameOverText.setColor("#FF7F50");
    //         this.input.setDefaultCursor("pointer");
    //     });

    //     gameOverText.on(Phaser.Input.Events.POINTER_OUT, () => {
    //         gameOverText.setColor("#8c7ae6");
    //         this.input.setDefaultCursor("default");
    //     });

    //     gameOverText.on(Phaser.Input.Events.POINTER_DOWN, () => {
    //         this.add.tween({
    //             targets: gameOverText,
    //             ease: Phaser.Math.Easing.Bounce.InOut,
    //             y: -1000,
    //             onComplete: () => {
    //                 this.restartGame();
    //             }
    //         })
    //     });
    // }

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
