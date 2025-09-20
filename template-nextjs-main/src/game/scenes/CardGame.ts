import { GameObjects, Scene } from "phaser";
import { EventBus } from "../EventBus";
import { createCard } from "../createCard";
import { CardObject, Dialogue, GridConfiguration } from "./types/Types";
import { DialogueEngine } from "./DialogueEngine";

export class CardGame extends Scene {
    background: GameObjects.Image;
    private minigameBackground: GameObjects.Image;
    private backgroundScale: number = 1;

    // --- UI and Menu Elements ---
    private buttons: Phaser.GameObjects.Rectangle[] = [];
    private focusIndex: number = -1;
    private focusIndicator!: Phaser.GameObjects.Rectangle;
    private settingsButton!: Phaser.GameObjects.Rectangle;
    private settingsText!: Phaser.GameObjects.Text;
    private pauseOverlay!: Phaser.GameObjects.Rectangle;
    private pauseMenu!: Phaser.GameObjects.Container;
    private isPaused: boolean = false;
    private peekButton!: GameObjects.Text;
    private isPeekMode: boolean = false;

    // --- Cutscene Elements ---
    private canvasClickHandler?: (ev: MouseEvent) => void;
    private cutsceneOverlay!: Phaser.GameObjects.Rectangle;
    private cutsceneText!: Phaser.GameObjects.Text;
    private cutsceneIndex: number = 0;
    private cutsceneLines: Dialogue[] = [
        {
            speaker: "Narrator",
            line: "You and Sidekick wander into an abandoned BANK, in search of Sidekick's missing memory chip, following a lead on his radar.",
        },
        {
            speaker: "Narrator",
            line: "Upon arrival, Sidekick's radar homes in on a vault...",
        },
        {
            speaker: "Sidekick",
            line: "That's it. According to my radar, that is where my memory chip is.",
        },
        {
            speaker: "User",
            line: "Oh boy, how will we get past that evil looking robot though.",
        },
        {
            speaker: "EnemySleep_Level_1",
            line: "ZzZzZzz",
        },
        {
            speaker: "Sidekick",
            line: "I think that robot may be asleep. Should we make a move now?",
        },
        {
            speaker: "User",
            line: "Looks like we have no choice. Let's try to hack the vault without getting caught. Come give me a hand!",
        },
        {
            speaker: "Sidekick",
            line: "I will try my best, but my accuracy is low without my memory chip. I might hallucinate at times. Be careful, as the alarm will go off if you fail too many times.",
        },
        {
            speaker: "Narrator",
            line: "Click to begin...",
        },
    ];

    private cutsceneLinesGameOver: Dialogue[] = [
        {
            speaker: "EnemySleep_Level_1",
            line: "zzzZZZzz...",
        },
        {
            speaker: "Narrator",
            line: "You run out of tries, vault intruder alert was triggered",
        },
        {
            speaker: "EnemyAwake_Level_1",
            line: "Huh, What's going on?!?!?",
        },
        {
            speaker: "User",
            line: "Oh no, lets get out of here",
        },
        {
            speaker: "Sidekick",
            line: "Aye Aye Captain",
        },
        {
            speaker: "EnemyAwake_Level_1",
            line: "STOP RUNNING, YOU CAN'T GET AWAY FROM ME THAT EASILY!!",
        },
        {
            speaker: "User",
            line: "AAAAAAAAAAA",
        },
    ];

    // --- Game Logic Properties ---
    private cardOpened?: CardObject;
    private cards: CardObject[] = [];
    private heartImages: GameObjects.Image[] = [];
    private winnerText!: GameObjects.Text;
    private gameOverText!: GameObjects.Text;
    private canMove: boolean = false;
    private lives: number = 3;
    private cardNames: string[] = ["card-0", "card-1", "card-2", "card-3", "card-4", "card-5", "card-6", "card-7"];

    private gridConfiguration: GridConfiguration = {
        x: 0,
        y: 0,
        paddingX: 10,
        paddingY: 10,
    };

    constructor() {
        super("CardGame");
    }

    init() {
        this.cameras.main.fadeIn(500);
        this.lives = 10;
    }

    preload() {
        this.load.setPath("assets/card_game/");
        this.load.image("cardgame-bg", "card_lore_bg.png");
        this.load.image("minigame-background", "card_minigame_bg.png");
        this.load.image("card-back", "card_unopened.png");
        this.load.image("card-front", "card_opened.png");
        this.load.spritesheet("card-0", "./card_faces/face_1.png", { frameWidth: 28, frameHeight: 32 });
        this.load.spritesheet("card-1", "./card_faces/face_2.png", { frameWidth: 28, frameHeight: 32 });
        this.load.spritesheet("card-2", "./card_faces/face_3.png", { frameWidth: 28, frameHeight: 32 });
        this.load.spritesheet("card-3", "./card_faces/face_4.png", { frameWidth: 28, frameHeight: 32 });
        this.load.spritesheet("card-4", "./card_faces/face_5.png", { frameWidth: 28, frameHeight: 32 });
        this.load.spritesheet("card-5", "./card_faces/face_6.png", { frameWidth: 28, frameHeight: 32 });
        this.load.spritesheet("card-6", "./card_faces/face_7.png", { frameWidth: 28, frameHeight: 32 });
        this.load.spritesheet("card-7", "./card_faces/face_8.png", { frameWidth: 28, frameHeight: 32 });
        this.load.image("heart", "pixel_heart.png");
        this.load.image("card-enemy-sleep", "CardGameEnemyAsleep.png");
        this.load.image("card-enemy-awake", "CardGameEnemyAwake.png");
        this.load.setPath("assets/");
        this.load.image("player", "Player.png");
        this.load.image("sidekick", "Sidekick.png");
        this.load.image("dialogue-box-left", "DialogueBoxLeft.png");
        this.load.image("dialogue-box-right", "DialogueBoxRight.png");
    }

    create() {
        this.cutsceneIndex = 0;
        this.events.once('shutdown', this.cleanup, this);

        this.background = this.add.image(512, 384, 'cardgame-bg');
        this.addMinigameBackground();
        this.createSettingsButton();
        this.createPeekButton();
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
            canvas.addEventListener("click", this.canvasClickHandler);
        }

        this.input.keyboard?.on('keydown-Q', this.togglePauseMenu, this);
        this.layout();
        this.scale.on("resize", this.layout, this);

        const cutsceneEngine: DialogueEngine = new DialogueEngine(this, this.cutsceneLines);
        cutsceneEngine.start();
        this.events.once("dialogueComplete", this.startGame, this);
        EventBus.emit("current-scene-ready", this);
    }

    private layout = () => {
        let w = this.scale.width;
        let h = this.scale.height;
        const PADDING = 20;

        const scaleX = Math.floor(w / this.background.width);
        const scaleY = Math.floor(h / this.background.height);
        const scale = Math.min(scaleX, scaleY);
        this.background.setScale(scale).setPosition(w / 2, h / 2);

        const new_w = this.background.displayWidth;
        const new_h = this.background.displayHeight;

        if (this.minigameBackground) {
            const bgScaleX = (new_w * 0.9) / this.minigameBackground.width;
            const bgScaleY = (new_h * 0.9) / this.minigameBackground.height;
            this.backgroundScale = Math.min(bgScaleX, bgScaleY);
            this.minigameBackground.setScale(this.backgroundScale).setPosition(w / 2, h / 2);
        }

        this.positionGameElements();

        if (this.settingsButton && this.settingsText) {
            const settingsX = w - PADDING - (this.settingsButton.width / 2);
            const settingsY = PADDING + (this.settingsButton.height / 2);
            this.settingsButton.setPosition(settingsX, settingsY);
            this.settingsText.setPosition(settingsX, settingsY);
        }

        if (this.peekButton) {
            const peekX = PADDING + (this.peekButton.width / 2);
            const peekY = PADDING + (this.peekButton.height / 2);
            this.peekButton.setPosition(peekX, peekY);
        }

        if (this.cutsceneOverlay && this.cutsceneOverlay.active) {
            this.cutsceneOverlay.setSize(w, h);
            this.cutsceneText.setPosition(w / 2, h / 2);
            this.cutsceneText.setStyle({ wordWrap: { width: w * 0.8 } });
        }

        if (this.pauseOverlay && this.pauseOverlay.active) {
            this.pauseOverlay.setSize(w, h);
            this.pauseMenu.setPosition(w / 2, h / 2);
        }
    };

    private positionGameElements() {
        if (!this.minigameBackground || !this.minigameBackground.active) {
            return;
        }

        const bgBounds = this.minigameBackground.getBounds();

        const getIntegerScale = (targetSize: number, baseSize: number): number => {
            if (targetSize <= 0 || baseSize <= 0) return 1;
            const idealScale = targetSize / baseSize;
            if (idealScale >= 1) {
                return Math.floor(idealScale);
            } else {
                return 1 / Math.ceil(1 / idealScale);
            }
        };

        if (this.cards.length > 0) {
            const rows = 2;
            const cols = 8;
            const baseCardWidth = 48;
            const baseCardHeight = 72;
            const cardPadding = bgBounds.width * 0.0075;
            const availableWidthForCards = bgBounds.width * 0.95;
            const totalPaddingX = (cols - 1) * cardPadding;
            const targetCardWidth = (availableWidthForCards - totalPaddingX) / cols;
            const finalCardScale = getIntegerScale(targetCardWidth, baseCardWidth);
            const scaledCardWidth = baseCardWidth * finalCardScale;
            const scaledCardHeight = baseCardHeight * finalCardScale;
            const gridWidth = (scaledCardWidth * cols) + ((cols - 1) * cardPadding);
            const gridHeight = (scaledCardHeight * rows) + ((rows - 1) * cardPadding);
            const startX = bgBounds.left + (bgBounds.width - gridWidth) / 2;
            const startY = bgBounds.top + (bgBounds.height - gridHeight) / 2;

            this.cards.forEach((card, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = startX + col * (scaledCardWidth + cardPadding) + (scaledCardWidth / 2);
                const y = startY + row * (scaledCardHeight + cardPadding) + (scaledCardHeight / 2);
                card.gameObject.setPosition(x, y).setScale(finalCardScale);
            });
        }

        if (this.heartImages.length > 0) {
            const baseHeartHeight = 1400;
            const targetHeartHeight = bgBounds.height * 0.06;
            const finalHeartScale = getIntegerScale(targetHeartHeight, baseHeartHeight);
            const scaledHeartDisplaySize = baseHeartHeight * finalHeartScale;
            const heartPadding = scaledHeartDisplaySize * 0.2;
            const totalHeartsWidth = (this.heartImages.length * scaledHeartDisplaySize) + ((this.heartImages.length - 1) * heartPadding);
            const heartsY = bgBounds.top + (scaledHeartDisplaySize / 2) + heartPadding * 2;
            const startHeartsX = bgBounds.right - heartPadding - totalHeartsWidth - (bgBounds.width * 0.0125);

            this.heartImages.forEach((heart, index) => {
                const x = startHeartsX + index * (scaledHeartDisplaySize + heartPadding) + (scaledHeartDisplaySize / 2);
                heart.setPosition(x, heartsY).setScale(finalHeartScale);
            });

            this.heartImages.reverse();
        }
    }

    private createGridCards() {
        const gridCardNames = Phaser.Utils.Array.Shuffle([...this.cardNames, ...this.cardNames]);
        const allAnimationKeys = this.cardNames.map(name => `${name}-anim`);

        this.cards = gridCardNames.map((name) => {
            const animationKey = `${name}-anim`;

            if (!this.anims.get(animationKey)) {
                this.anims.create({
                    key: animationKey,
                    frames: this.anims.generateFrameNumbers(name, { start: 7, end: 0 }),
                    frameRate: 32,
                    repeat: 0,
                    showOnStart: true,
                });
            }

            const newCard = createCard({
                scene: this,
                x: -1000,
                y: -1000,
                frontTexture: "card-front",
                backTexture: "card-back",
                animationKey: animationKey,
                cardName: name,
                allAnimationKeys: allAnimationKeys,
                hallucinationChance: 0.15,
            });
            newCard.gameObject.setDepth(10);
            return newCard;
        });
    }

    private createHearts() {
        this.heartImages = Array.from({ length: this.lives }).map(() => {
            return this.add.image(-1000, -1000, "heart").setDepth(1000);
        });
    }

    private addMinigameBackground() {
        this.minigameBackground = this.add.image(0, 0, 'minigame-background')
            .setAlpha(0.85)
            .setDepth(1)
            .setVisible(false);
    }

    private startGame() {
        this.minigameBackground.setVisible(true);
        this.winnerText = this.add.text(this.scale.width / 2, -1000, "YOU WIN\nClick to play again", {
            align: "center",
            strokeThickness: 4,
            fontSize: 40,
            fontStyle: "bold",
            color: "#8c7ae6",
        }).setOrigin(0.5).setDepth(3000).setInteractive({ useHandCursor: true });
        this.gameOverText = this.add.text(this.scale.width / 2, -1000, "GAME OVER\nClick to restart", {
            align: "center",
            strokeThickness: 4,
            fontSize: 40,
            fontStyle: "bold",
            color: "#ff0000",
        }).setOrigin(0.5).setDepth(3000).setInteractive({ useHandCursor: true });

        this.winnerText.on('pointerdown', () => this.scene.start('LevelSelect'));
        this.gameOverText.on('pointerdown', () => this.restartGame());

        this.createHearts();
        this.createGridCards();
        this.positionGameElements();
        this.peekButton.setVisible(true);

        this.time.delayedCall(500, () => {
            this.canMove = true;
        });

        this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleCardClick, this);
        this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    }

    private restartGame() {
        this.canMove = false;
        this.cutsceneIndex = 0;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.restart();
        });
    }

    private handleCardClick(pointer: Phaser.Input.Pointer) {
        if (this.peekButton && this.peekButton.getBounds().contains(pointer.x, pointer.y)) {
            return;
        }
        if (this.settingsButton && this.settingsButton.getBounds().contains(pointer.x, pointer.y)) {
            return;
        }

        if (!this.canMove || this.isPaused || this.isPeekMode) return;

        const card = this.cards.find(c => c.hasFaceAt(pointer.x, pointer.y));

        if (card) {
            if (card === this.cardOpened || !card.isFaceDown()) return;

            this.canMove = false;
            card.flip(() => {
                if (this.cardOpened) {
                    if (this.cardOpened.cardName === card.cardName) {
                        this.cardOpened.destroy();
                        card.destroy();
                        this.cards = this.cards.filter(c => c.cardName !== card.cardName);
                        this.cardOpened = undefined;
                        this.canMove = true;
                        this.checkWinCondition();
                    } else {
                        this.lives--;
                        const heartToRemove = this.heartImages.pop();

                        if (heartToRemove) {
                            this.add.tween({
                                targets: heartToRemove,
                                y: heartToRemove.y - 100,
                                alpha: 0,
                                duration: 300,
                                onComplete: () => {
                                    if (heartToRemove && heartToRemove.active) {
                                        heartToRemove.destroy();
                                    }
                                },
                            });
                        }

                        this.cameras.main.shake(300, 0.01);

                        this.time.delayedCall(500, () => {
                            card.flip();
                            this.cardOpened?.flip(() => {
                                this.cardOpened = undefined;
                                this.canMove = true;
                                this.checkLossCondition();
                            });
                        });
                    }
                } else {
                    this.cardOpened = card;
                    this.canMove = true;
                }
            });
        }
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer) {
        if (this.canMove && !this.isPaused) {
            const card = this.cards.find(c => c.hasFaceAt(pointer.x, pointer.y));
            this.input.setDefaultCursor(card ? "pointer" : "default");
        }
    }

    private checkWinCondition() {
        if (this.cards.length === 0) {
            this.canMove = false;
            this.add.tween({
                targets: this.winnerText,
                y: this.scale.height / 2,
                ease: 'Bounce.Out',
                duration: 1000,
            });
        }
    }

    private checkLossCondition() {
        if (this.lives <= 0) {
            this.canMove = false;
            const cutsceneEngine: DialogueEngine = new DialogueEngine(this, this.cutsceneLinesGameOver);
            cutsceneEngine.start();
            this.events.once("dialogueComplete", this.gameOverAnimiation, this);
        }
    }

    private gameOverAnimiation() {
        this.add.tween({
            targets: this.gameOverText,
            y: this.scale.height / 2,
            ease: 'Bounce.Out',
            duration: 1000,
        });
    }

    private cleanup() {
        console.log('CardGame Cleanup Called');
        this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleCardClick, this);
        this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
        this.scale.off('resize', this.layout, this);
        this.input.keyboard?.off('keydown-Q', this.togglePauseMenu, this);

        const canvas = this.game.canvas as HTMLCanvasElement;
        if (canvas && this.canvasClickHandler) {
            canvas.removeEventListener('click', this.canvasClickHandler);
            this.canvasClickHandler = undefined;
        }

        this.cards.forEach(card => card.destroy());
        this.heartImages.forEach(heart => heart.destroy());
        if (this.winnerText) this.winnerText.destroy();
        if (this.gameOverText) this.gameOverText.destroy();

        this.cards = [];
        this.heartImages = [];
        this.cardOpened = undefined;
        this.isPaused = false;
        this.isPeekMode = false;
    }

    private createSettingsButton() {
        this.settingsButton = this.add
            .rectangle(0, 0, 80, 40, 0x333333)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.togglePauseMenu())
            .setDepth(10001);

        this.settingsText = this.add
            .text(0, 0, "Settings", {
                fontFamily: "Arial",
                fontSize: "14px",
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setDepth(10002);
    }

    private createPeekButton() {
        this.peekButton = this.add.text(0, 0, 'Peek 🔍', {
            fontFamily: "Arial Black",
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: '#333333',
            padding: { x: 10, y: 5 },
        })
            .setOrigin(0.5)
            .setDepth(10001)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.togglePeekMode())
            .setVisible(false);
    }

    private togglePeekMode() {
        if (!this.canMove || this.isPaused) return;

        this.isPeekMode = !this.isPeekMode;

        if (this.isPeekMode) {
            console.log('Peek mode ACTIVATED.');
            this.peekButton.setText('Exit Peek ✖️')
                .setColor('#FFC0CB')
                .setBackgroundColor('#8B0000');
            
            // Open all cards that are currently face down
            this.cards.forEach(card => {
                if (card.isFaceDown()) {
                    card.flip();
                }
            });

        } else {
            console.log('Peek mode DEACTIVATED.');
            this.peekButton.setText('Peek 🔍')
                .setColor('#ffffff')
                .setBackgroundColor('#333333');

            // Close all cards that are currently face up
            this.cards.forEach(card => {
                if (!card.isFaceDown()) {
                    card.flip();
                }
            });
        }
    }

    private createPauseMenu() {
        this.pauseOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.5)
            .setOrigin(0, 0)
            .setDepth(15000);

        this.pauseMenu = this.add.container(this.scale.width / 2, this.scale.height / 2);
        this.pauseMenu.setDepth(15001);

        const menuBg = this.add.rectangle(0, 0, 300, 200, 0x222222)
            .setStrokeStyle(2, 0xffffff);
        this.pauseMenu.add(menuBg);

        const title = this.add.text(0, -70, 'Pause Menu', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);
        this.pauseMenu.add(title);

        const resumeBtn = this.add.rectangle(0, -20, 200, 40, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.togglePauseMenu());
        this.pauseMenu.add(resumeBtn);

        const resumeText = this.add
            .text(0, -20, "Resume", {
                fontFamily: "Arial Black",
                fontSize: "18px",
                color: "#ffffff",
            })
            .setOrigin(0.5);
        this.pauseMenu.add(resumeText);

        const restartBtn = this.add.rectangle(0, 30, 200, 40, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.restartScene());
        this.pauseMenu.add(restartBtn);

        const restartText = this.add
            .text(0, 30, "Restart", {
                fontFamily: "Arial Black",
                fontSize: "18px",
                color: "#ffffff",
            })
            .setOrigin(0.5);
        this.pauseMenu.add(restartText);

        const levelSelectBtn = this.add.rectangle(0, 80, 200, 40, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.start('LevelSelect');
            });
        this.pauseMenu.add(levelSelectBtn);

        const levelSelectText = this.add
            .text(0, 80, "Level Select", {
                fontFamily: "Arial Black",
                fontSize: "18px",
                color: "#ffffff",
            })
            .setOrigin(0.5);
        this.pauseMenu.add(levelSelectText);
    }

    private togglePauseMenu() {
        if (this.isPaused) {
            this.pauseOverlay.destroy();
            this.pauseMenu.destroy();
            this.isPaused = false;
        } else {
            this.createPauseMenu();
            this.isPaused = true;
        }
    }

    private restartScene() {
        this.isPaused = false;
        this.cutsceneIndex = 0;
        this.scene.restart();
    }

    private focusNextButton() {
        this.focusIndex = (this.focusIndex + 1) % this.buttons.length;
        const button = this.buttons[this.focusIndex];
        const b = button.getBounds();
        this.focusIndicator
            .setSize(b.width, b.height)
            .setPosition(b.centerX, b.centerY)
            .setVisible(true);
    }
}