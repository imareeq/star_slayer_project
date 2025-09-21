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
    private isPeekLoading: boolean = false;

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
        line: "ZzZ... *twitch* ...ZzZ...",
    },
    {
        speaker: "Narrator",
        line: "Your final attempt to hack the vault fails. A piercing siren blares, and red lights flood the bank!",
    },
    {
        speaker: "EnemyAwake_Level_1",
        line: "WHO DARES DISTURB MY SLUMBER?! Intruders in the vault!",
    },
    {
        speaker: "Sidekick",
        line: "Oh no, my sensors are going haywire! That robot's awake, and it's NOT happy!",
    },
    {
        speaker: "Narrator",
        line: "The ground shakes as the massive robot lurches toward you, its eyes glowing with menace.",
    },
    {
        speaker: "EnemyAwake_Level_1",
        line: "You thought you could steal from MY vault? You'll pay for this!",
    },
    {
        speaker: "Sidekick",
        line: "Captain, we're out of time! Run, or we're scrap metal!",
    },
    {
        speaker: "Narrator",
        line: "You and Sidekick sprint for the exit, but the robot's thundering steps are right behind you...",
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
    private defualtNumTry = 2
    private numTryBeforeDamage = this.defualtNumTry;

    // --- Help System Properties ---
    private helpButton!: GameObjects.Text;
    private cardPositionSeen: Boolean[] = Array(16).fill(false);  // Track  each card type has been seen
    private highlightedCard?: CardObject;
    private highlightIndicator?: GameObjects.Rectangle;
    private originalCardPositions: Map<number, string> = new Map(); // Track original card positions
    private cardToGridPosition: Map<CardObject, number> = new Map(); // Map each card to its grid position
    private gridToCard: Map<number, CardObject> = new Map(); // Map grid position to current card object

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
        this.createHelpButton();
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

        if (this.helpButton) {
            const helpX = PADDING + (this.helpButton.width / 2);
            const helpY = PADDING + (this.helpButton.height / 2) + 50; // Position below peek button
            this.helpButton.setPosition(helpX, helpY);
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

        // Store original card name positions
        this.originalCardPositions.clear();
        gridCardNames.forEach((name, index) => {
            this.originalCardPositions.set(index, name);
        });

        this.cards = gridCardNames.map((name, index) => {
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
            
            // Map this card to index and vice versa
            this.cardToGridPosition.set(newCard, index);
            this.gridToCard.set(index, newCard);
            
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
        this.helpButton.setVisible(true);

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
        if (this.helpButton && this.helpButton.getBounds().contains(pointer.x, pointer.y)) {
            return;
        }

        if (!this.canMove || this.isPaused || this.isPeekMode) return;

        const card = this.cards.find(c => c.hasFaceAt(pointer.x, pointer.y));

        if (card) {
            if (card === this.cardOpened || !card.isFaceDown()) return;

            this.canMove = false;
            card.flip(false, () => {
                // Track card location when manually clicked
                this.trackCardLocation(card);

                if (this.cardOpened) {
                    if (this.cardOpened.cardName === card.cardName) {
                        // Remove cards from grid mapping before destroying
                        const openedGridPos = this.cardToGridPosition.get(this.cardOpened);
                        const currentGridPos = this.cardToGridPosition.get(card);
                        
                        if (openedGridPos !== undefined) {
                            this.gridToCard.delete(openedGridPos);
                        }
                        if (currentGridPos !== undefined) {
                            this.gridToCard.delete(currentGridPos);
                        }
                        
                        this.cardOpened.destroy();
                        card.destroy();
                        this.cards = this.cards.filter(c => c.cardName !== card.cardName);
                        this.cardOpened = undefined;
                        this.canMove = true;
                        this.checkWinCondition();
                    } else {
                        if (this.numTryBeforeDamage <= 1) {
                            this.numTryBeforeDamage = this.defualtNumTry;
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
                        } else {
                            this.numTryBeforeDamage -= 1;
                        }

                        this.cameras.main.shake(300, 0.01);

                        this.time.delayedCall(500, () => {
                            card.flip(false);
                            this.cardOpened?.flip(false,() => {
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
        if (this.helpButton) this.helpButton.destroy();
        this.clearHighlight();

        this.cards = [];
        this.heartImages = [];
        this.cardOpened = undefined;
        this.isPaused = false;
        this.isPeekMode = false;
        this.cardPositionSeen = Array(16).fill(false);  
        this.originalCardPositions.clear();
        this.cardToGridPosition.clear();
        this.gridToCard.clear();
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

    private createHelpButton() {
        this.helpButton = this.add.text(0, 0, 'Help 💡', {
            fontFamily: "Arial Black",
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: '#01C11B',
            padding: { x: 10, y: 5 },
        })
            .setOrigin(0.5)
            .setDepth(10001)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                console.log('Help button clicked!');
                this.requestHelp();
            })
            .setVisible(false);
    }

    private togglePeekMode() {
        if (!this.canMove || this.isPaused || this.isPeekLoading) return;

        this.isPeekMode = !this.isPeekMode;
        
        console.log(this.isPeekLoading)
        if (this.isPeekMode) {
            this.isPeekLoading = true;
            console.log('Peek mode ACTIVATED.');
            this.peekButton.setText('Exit Peek ✖️')
                .setColor('#FFC0CB')
                .setBackgroundColor('#8B0000');
            
            // Open all cards that are currently face down
            const cardsToFlip = this.cards.filter(card => card.isFaceDown());
            
            if (cardsToFlip.length === 0) {
                // No cards to flip, immediately reset loading state
                this.isPeekLoading = false;
            } else {
                // Flip cards and reset loading state when all are done
                let completedFlips = 0;
                cardsToFlip.forEach(card => {
                    card.flip(true, () => {
                        completedFlips++;
                        if (completedFlips === cardsToFlip.length) {
                            this.isPeekLoading = false;
                        }
                    });
                });
            }

        } else {
            this.isPeekLoading = true;
            console.log('Peek mode DEACTIVATED.');
            this.peekButton.setText('Peek 🔍')
                .setColor('#ffffff')
                .setBackgroundColor('#333333');

            // Close all cards that are currently face up
            const cardsToFlip = this.cards.filter(card => !card.isFaceDown() && card !== this.cardOpened);
            
            if (cardsToFlip.length === 0) {
                // No cards to flip, immediately reset loading state
                this.isPeekLoading = false;
            } else {
                // Flip cards and reset loading state when all are done
                let completedFlips = 0;
                cardsToFlip.forEach(card => {
                    card.flip(true, () => {
                        completedFlips++;
                        if (completedFlips === cardsToFlip.length) {
                            this.isPeekLoading = false;
                        }
                    });
                });
            }
        }
    }

    private trackCardLocation(card: CardObject) {
        // Get the grid position for this card
        const gridPosition = this.cardToGridPosition.get(card);
        if (gridPosition === undefined) return;

        this.cardPositionSeen[gridPosition] = true;
    }

    
    private async requestHelp() {
        // Only request help if the game is not paused and a card is opened
        if (!this.canMove || this.isPaused || !this.cardOpened) {
            console.log('Help button clicked but conditions not met:', {
                isPaused: this.isPaused,
                cardOpened: !!this.cardOpened
            });
            return;
        }

        console.log('Help button clicked - requesting AI assistance');
        
        const currentCard = this.cardOpened.cardName;
        const boardState = this.generateBoardState();
        const hallucinationNumber = Math.floor(Math.random() * 100)+1;

        console.log('Input data:', {
            currentCard,
            boardState,
            hallucinationNumber
        });

        // Button is busy
        this.helpButton.setText('Loading...')
            .setColor('#FFA500')
            .setBackgroundColor('#8B4513')
            .disableInteractive();

        try {
            const requestBody = {
                model: 'sonar',
                messages: [
                    {
                        role: 'system',
                        content: `You are a memory assistant for a card-matching game. Your task is to find the location of a matching card.
                                    Rules:
                                    1. Return a single coordinate index (0-15) where the current_card is located.
                                    2. Ignore any slots labeled "matched (ignore)". These cannot be selected.
                                    3. If hallucination_number greater than 70 and the current card has been seen, intentionally give an incorrect location. The coordinate must be in the valid range 0-15 and not a matched card.
                                    4. Do NOT hallucinate if the current card has NOT been seen yet. In that case, choose any random valid index in the range 0-15 that hasn't been seen already i.e. select random index that is "not_checked".
                                    5. If hallucination_number less than or equal to 70, return the correct location if you know it. If unknown, choose any random valid index in the range 0-15 that is "not_checked".
                                    6. Output format must be: [chosen_index] ONLY. Do not include text, explanations, or multiple indices.
                                    Example Inpute Data: Board:   [0] - matched (ignore)\n  [1] - not_checked\n  [2] - not_checked\n  [3] - not_checked\n  [4] - not_checked\n  [5] - not_checked\n  [6] - not_checked\n  [7] - card-3\n  [8] - not_checked\n  [9] - not_checked\n  [10] - not_checked\n  [11] - not_checked\n  [12] - not_checked\n  [13] - not_checked\n  [14] - not_checked\n  [15] - not_checked Current Card: card-3 Hallucination Number: 25 REMINDER: Output ONLY one index in the format [number].
                                    Example Output: [7]`
                    },
                    {
                        role: 'user',
                        content: `Input Data: Board: ${boardState} Current Card: ${currentCard} Hallucination Number: ${hallucinationNumber} REMINDER: Output ONLY one index in the format [number].`
                    }
                ],
                max_tokens: 500 // Reduced for faster response
            };

            console.log('Sending request to API:', requestBody);

            const response = await fetch('/api/requestAI', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            
            const data = await response.json();
            console.log('API response status:', response.status);
            console.log('API response data:', data);

            if (data.success && data.aiDecision && data.aiDecision !== 'No response generated') {
                console.log('AI Decision received:', data.aiDecision);
                // Get index using regex
                const match = data.aiDecision.match(/\[(\d+)\]/);
                if (match) {
                    // Convert to number
                    const suggestedIndex = parseInt(match[1]);
                    console.log('Suggested card index:', suggestedIndex);
                    this.highlightSuggestedCard(suggestedIndex);
                } else {
                    console.log('No valid index found in AI response:', data.aiDecision);
                    // Fallback: suggest a random valid card
                    this.suggestRandomCard();
                }
            } else {
                console.log('AI request failed or no decision generated:', data);
                // Fallback: suggest a random valid card
                this.suggestRandomCard();
            }
        } catch (error) {
            console.error('Error requesting help:', error);
        } finally {
            // Reset help button
            this.helpButton.setText('Help 💡')
                .setColor('#ffffff')
                .setBackgroundColor('#01C11B')
                .setInteractive({ useHandCursor: true });
        }
    }

    private generateBoardState(): string {
        const boardLines: string[] = [];
        
        for (let i = 0; i < 16; i++) {
            const card = this.gridToCard.get(i);
            const originalCardName = this.originalCardPositions.get(i);
            
            if (!card || !card.gameObject.active) {
                // Card was matched and removed
                boardLines.push(`  [${i}] - matched (ignore)`);
            } else if (card === this.cardOpened) {
                // Mark currently opened card as matched (ignore) so AI won't suggest it
                boardLines.push(`  [${i}] - matched (ignore)`);
            } else {
                // Check if we've seen this card before at this position
             
                if (this.cardPositionSeen[i]) {
                    // Show the actual card name if it was opened manually at this position
                    boardLines.push(`  [${i}] - ${originalCardName}`);
                } else {
                    boardLines.push(`  [${i}] - not_checked`);
                }
            }
        }
        
        return boardLines.join('\n');
    }

    private highlightSuggestedCard(index: number) {
        // Clear previous highlight
        this.clearHighlight();

        if (index >= 0 && index < 16) {
            const card = this.gridToCard.get(index);
            if (card && card.gameObject.active) {
                this.highlightedCard = card;
                
                // Create highlight indicator
                const bounds = card.gameObject.getBounds();
                this.highlightIndicator = this.add.rectangle(
                    bounds.centerX, 
                    bounds.centerY, 
                    bounds.width + 10, 
                    bounds.height + 10, 
                    0xff0000, 
                    0
                )
                .setStrokeStyle(4, 0xff0000)
                .setDepth(10002);

                // Auto-clear highlight after 3 seconds
                this.time.delayedCall(3000, () => {
                    this.clearHighlight();
                });
            }
        }
    }

    private clearHighlight() {
        if (this.highlightIndicator) {
            this.highlightIndicator.destroy();
            this.highlightIndicator = undefined;
        }
        this.highlightedCard = undefined;
    }

    private suggestRandomCard() {
        console.log('Using fallback: suggesting random card');
        
        // Find all valid cards (not matched, not currently opened)
        const validCards: number[] = [];
        for (let i = 0; i < 16; i++) {
            const card = this.gridToCard.get(i);
            if (card && card.gameObject.active && card !== this.cardOpened) {
                validCards.push(i);
            }
        }
        
        if (validCards.length > 0) {
            const randomIndex = validCards[Math.floor(Math.random() * validCards.length)];
            console.log('Fallback suggested card index:', randomIndex);
            this.highlightSuggestedCard(randomIndex);
        } else {
            console.log('No valid cards found for fallback');
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