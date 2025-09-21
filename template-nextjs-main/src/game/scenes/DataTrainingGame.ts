import { GameObjects, Scene } from "phaser";
import { DialogueEngine } from "./DialogueEngine";
import { Dialogue, TrainingPrompt } from "./types/Types";

export class DataTrainingGame extends Scene {
    private canvasClickHandler?: (ev: MouseEvent) => void;
    private terminalContainer!: Phaser.GameObjects.Container;
    private cutsceneOverlay!: Phaser.GameObjects.Rectangle;
    private cutsceneText!: Phaser.GameObjects.Text;

    // --- UI and Menu Elements ---
    private buttons: Phaser.GameObjects.Rectangle[] = [];
    private focusIndex: number = -1;
    private focusIndicator!: Phaser.GameObjects.Rectangle;
    private settingsButton!: Phaser.GameObjects.Rectangle;
    private settingsText!: Phaser.GameObjects.Text;
    private pauseOverlay!: Phaser.GameObjects.Rectangle;
    private pauseMenu!: Phaser.GameObjects.Container;
    private isPaused: boolean = false;

    // --- Game Logic Properties ---
    private background: GameObjects.Image;
    private minigameTerminal: GameObjects.Image;
    private progressBar: GameObjects.Sprite;
    private currentProgress: number;
    private promptText!: GameObjects.Text;
    private optionButtons: GameObjects.Rectangle[] = [];
    private optionTexts: GameObjects.Text[] = [];
    private selected: boolean[] = [];
    private maxSelections: number = 5;
    private counterText!: GameObjects.Text;
    private submitContainer: GameObjects.Container;
    private currentPromptIndex: number;
    private winnerText!: GameObjects.Text;
    private gameOverText!: GameObjects.Text;
    private trainingDataPromise: Promise<void>;

    progressBarIndexMap: Record<number, number> = {
        1: 12,
        2: 6,
        3: 13,
        4: 0,
        5: 7,
        6: 14,
        7: 1,
        8: 8,
        9: 15,
        10: 2,
    };

    // cutscene elements
    private cutsceneLines: Dialogue[] = [
        {
            speaker: "Narrator",
            line: "Following your successful heist of Sidekick's memory chip from the bank, you have arrived at a factory to mount it into Sidekick's hardware.",
        },
        {
            speaker: "User",
            line: "Alright, we've got the chip. Fingers crossed this works...",
        },
        {
            speaker: "Sidekick",
            line: "You got this! Hold on... I am picking up some activity outside the factory - OH NO! The enemy has tracked us! You need to hurry. I have triggered the locks, but I am not sure how long that will hold them off! I can find us a path out once you are done.",
        },
        {
            speaker: "User",
            line: "Got it! I'll mount the chip ASAP!",
        },
        {
            speaker: "User",
            line: "Done. Did it work?",
        },
        {
            speaker: "Sidekick",
            line: "I think it di-",
        },
        {
            speaker: "Sidekick",
            line: "Wait, something is wrong... My system is glitching out. It looks like the memory chip somehow ruined my calibration. Quick, you need to access my terminal and recalibrate right now!",
        },
        {
            speaker: "User",
            line: "Hang in there! I'll do my best!",
        },
        {
            speaker: "Narrator",
            line: "You will be given a series of scenes. For each scene, select the 5 words that best match it. You need an accuracy score of atleast 70% to pass. The current accuracy is displayed at the top of the terminal.",
        },
        {
            speaker: "Narrator",
            line: "Click to begin...",
        },
    ];

    private gameOverLines: Dialogue[] = [
        {
            speaker: "User",
            line: "Oh no! I messed it up!",
        },
        {
            speaker: "Sidekick",
            line: "My calibration is fried, I don't know what to do!",
        },
        {
            speaker: "User",
            line: "Let's make a run for it, follow me!",
        },
    ];

    private gameWinLines: Dialogue[] = [
        {
            speaker: "User",
            line: "I think that's it. Did it work?",
        },
        {
            speaker: "Sidekick",
            line: "I think it did. I can feel this new power in my wires. Let me scan the area and find us an escape route.",
        },
        {
            speaker: "Sidekick",
            line: "Follow me!",
        },
    ];

    private prompts: TrainingPrompt[];

    private async fetchTrainingPrompts(): Promise<any> {
        try {
            const response = await fetch("/api/trainingGameAIReq", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const result = await response.json();

            return result;
        } catch (error) {
            console.error("Error calling training game API:", error);
        }
    }

    init() {
        this.cameras.main.fadeIn(500);
    }

    constructor() {
        super("DataTrainingGame");
    }

    preload() {
        this.load.image(
            "training-bg",
            "assets/training_game/training_lore_bg.png"
        );
        this.load.image(
            "training-terminal",
            "assets/training_game/training_minigame_bg.png"
        );
        this.load.image("player", "assets/Player.png");
        this.load.image("sidekick", "assets/Sidekick.png");
        this.load.image("dialogue-box-left", "assets/DialogueBoxLeft.png");
        this.load.image("dialogue-box-right", "assets/DialogueBoxRight.png");
        this.load.spritesheet(
            "progress-bar",
            "assets/training_game/progress_bar.png",
            {
                frameWidth: 166,
                frameHeight: 18,
            }
        );
    }

    create() {
        this.events.once("shutdown", this.cleanup, this);

        this.trainingDataPromise = this.fetchTrainingPrompts().then(
            (result) => {
                this.prompts =
                    JSON.parse(
                        result.message.replace(/```(?:json)?/g, "").trim()
                    ).prompts || [];
            }
        );

        this.background = this.add.image(0, 0, "training-bg");
        this.terminalContainer = this.add.container(0, 0, []);
        this.currentProgress = 1;
        this.createMinigameTerminal();
        this.createProgressBar(this.currentProgress);
        this.createPromptCounter();
        this.currentPromptIndex = 0;
        this.createSubmitBtn();
        this.createSettingsButton();

        this.focusIndicator = this.add
            .rectangle(0, 0, 310, 65, 0xffff00, 0)
            .setStrokeStyle(2, 0xffff00)
            .setVisible(false)
            .setDepth(10000);

        const canvas = this.game.canvas as HTMLCanvasElement;
        if (canvas) {
            canvas.setAttribute("tabindex", "0");
            canvas.focus();
            this.canvasClickHandler = () => {
                canvas.focus();
            };
            canvas.addEventListener("click", this.canvasClickHandler);
        }

        this.layout();
        this.scale.on("resize", this.layout, this);

        const cutsceneEngine: DialogueEngine = new DialogueEngine(
            this,
            this.cutsceneLines
        );

        cutsceneEngine.start();

        this.events.once("dialogueComplete", async () => {
            if (!this.prompts) {
                await this.trainingDataPromise;
            }
            this.createPromptText(this.currentPromptIndex);
            this.layout();

            this.startGame();
        });
    }

    private startGame() {
        this.showTerminal();

        this.winnerText = this.add
            .text(this.scale.width / 2, -1000, "YOU WIN\nClick to continue", {
                align: "center",
                strokeThickness: 4,
                fontSize: 40,
                fontStyle: "bold",
                color: "#8c7ae6",
            })
            .setOrigin(0.5)
            .setDepth(3000)
            .setInteractive({ useHandCursor: true });

        this.gameOverText = this.add
            .text(
                this.scale.width / 2,
                -1000,
                "GAME OVER\nClick to try again",
                {
                    align: "center",
                    strokeThickness: 4,
                    fontSize: 40,
                    fontStyle: "bold",
                    color: "#ff0000",
                }
            )
            .setOrigin(0.5)
            .setDepth(3000)
            .setInteractive({ useHandCursor: true });

        this.winnerText.on("pointerdown", () =>
            this.scene.start("LevelSelect")
        );
        this.gameOverText.on("pointerdown", () => this.restartGame());

        this.progressBar.setVisible(true);
        this.promptText.setVisible(true);
        this.counterText.setVisible(true);
        this.submitContainer.setVisible(true);
        this.createOptionButtons(1);

        this.events.once("trainingCompleted", this.endSequence, this);
    }

    private endSequence() {
        if (this.currentProgress >= 7) {
            const cutsceneEngine: DialogueEngine = new DialogueEngine(
                this,
                this.gameWinLines
            );

            cutsceneEngine.start();

            this.events.once("dialogueComplete", this.gameWin, this);
        } else {
            const cutsceneEngine: DialogueEngine = new DialogueEngine(
                this,
                this.gameOverLines
            );

            cutsceneEngine.start();

            this.events.once("dialogueComplete", this.gameOver, this);
        }
    }

    private gameOver() {
        this.add.tween({
            targets: this.gameOverText,
            y: this.scale.height / 2,
            ease: "Bounce.Out",
            duration: 1000,
        });
    }

    private gameWin() {
        this.add.tween({
            targets: this.winnerText,
            y: this.scale.height / 2,
            ease: "Bounce.Out",
            duration: 1000,
        });
    }

    private createSubmitBtn() {
        const w = this.scale.width;
        const h = this.scale.height;

        const buttonWidth = 140;
        const buttonHeight = 40;

        const submitBtnBg = this.add
            .rectangle(0, 0, buttonWidth, buttonHeight, 0x2f2d42)
            .setInteractive({ useHandCursor: true });

        const submitTxt = this.add
            .text(0, 0, "Train", {
                fontFamily: "Arial",
                fontSize: "16px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.submitContainer = this.add.container(w / 2, h * 0.75, [
            submitBtnBg,
            submitTxt,
        ]);

        this.submitContainer.setVisible(false);

        submitBtnBg.on("pointerdown", () => {
            this.handleTraining();
        });
    }

    private nextPrompt() {
        this.optionButtons.forEach((btn) => btn.destroy());
        this.optionTexts.forEach((txt) => txt.destroy());
        this.optionButtons = [];
        this.optionTexts = [];

        if (this.currentPromptIndex >= this.prompts.length) {
            this.events.emit("trainingCompleted");
            this.submitContainer.destroy();
            this.destroyTerminal();
            this.progressBar.destroy();
            this.counterText.destroy();
            this.promptText.destroy();
            return;
        }

        const prompt = this.prompts[this.currentPromptIndex];
        this.promptText.setText(prompt.prompt_text);
        this.selected = new Array(prompt.options.length).fill(false);

        this.createOptionButtons(this.currentPromptIndex);

        this.counterText.setText(`Selected: 0/${this.maxSelections}`);
    }

    private handleTraining() {
        const playerWeight = this.selected
            .map((isSelected, index) =>
                isSelected
                    ? this.prompts[this.currentPromptIndex].options[index]
                          .weight
                    : 0
            )
            .reduce((sum, w) => sum + w, 0);

        const maxWeight = this.prompts[this.currentPromptIndex].options
            .sort((a, b) => b.weight - a.weight)
            .slice(0, this.maxSelections)
            .reduce((sum, o) => sum + o.weight, 0);

        if (playerWeight / maxWeight >= 0.75) {
            this.currentProgress = Math.min(10, this.currentProgress + 1);
        } else {
            this.currentProgress = Math.max(1, this.currentProgress - 1);
        }

        this.progressBar.setFrame(
            this.progressBarIndexMap[this.currentProgress]
        );

        ++this.currentPromptIndex;

        this.nextPrompt();
    }

    private createMinigameTerminal() {
        this.minigameTerminal = this.add
            .image(
                this.scale.width / 2,
                this.scale.height / 2,
                "training-terminal"
            )
            .setOrigin(0.5)
            .setDepth(10)
            .setVisible(false);
    }

    private createProgressBar(progress: number) {
        this.progressBar = this.add
            .sprite(100, 50, "progress-bar", this.progressBarIndexMap[progress])
            .setDepth(100)
            .setVisible(false);
    }

    private createPromptText(promptId: number) {
        if (this.promptText) {
            this.promptText.destroy();
        }
        
        this.promptText = this.add
            .text(0, 0, this.prompts[this.currentPromptIndex].prompt_text, {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#ffffff",
            })
            .setDepth(110)
            .setOrigin(0.5)
            .setVisible(false);
    }

    private createOptionButtons(promptId: number) {
        const w = this.scale.width;
        const h = this.scale.height;

        this.selected = new Array(
            this.prompts[this.currentPromptIndex].options.length
        ).fill(false);

        const buttonWidth = 140;
        const buttonHeight = 40;
        const spacing = 10;
        const cols = 5;
        const rows = Math.ceil(
            this.prompts[this.currentPromptIndex].options.length / cols
        );

        const gridWidth = cols * buttonWidth + (cols - 1) * spacing;
        const gridHeight = rows * buttonHeight + (rows - 1) * spacing;

        const startX = w / 2 - gridWidth / 2 + buttonWidth / 2;
        const startY = h / 2 - gridHeight / 2 + buttonHeight / 2;

        this.prompts[this.currentPromptIndex].options.forEach((opt, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = startX + col * (buttonWidth + spacing);
            const y = startY + row * (buttonHeight + spacing);

            const btn = this.add
                .rectangle(x, y, buttonWidth, buttonHeight, 0x2f2d42)
                .setInteractive({ useHandCursor: true });
            this.optionButtons.push(btn);

            const txt = this.add
                .text(x, y, opt.word, {
                    fontFamily: "Arial",
                    fontSize: "16px",
                    color: "#ffffff",
                })
                .setOrigin(0.5);
            this.optionTexts.push(txt);

            btn.on("pointerdown", () => this.toggleSelection(index));
        });
    }

    private createPromptCounter() {
        this.counterText = this.add
            .text(0, 0, `Selected: 0/${this.maxSelections}`, {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#ffff00",
            })
            .setDepth(110)
            .setOrigin(0.5)
            .setVisible(false);
    }

    private showTerminal() {
        const overlay = this.add
            .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.6)
            .setOrigin(0);

        this.minigameTerminal.setVisible(true);

        this.terminalContainer.add([overlay, this.minigameTerminal]);
    }

    private destroyTerminal() {
        if (this.terminalContainer) {
            this.terminalContainer.iterate(
                (child: Phaser.GameObjects.GameObject) => {
                    child.destroy();
                }
            );
            this.terminalContainer.destroy();

            this.terminalContainer = null!;
        }

        if (this.minigameTerminal) {
            this.minigameTerminal.destroy();
            this.minigameTerminal = null!;
        }
    }

    private toggleSelection(index: number) {
        const currentSelected = this.selected.filter((s) => s).length;
        if (!this.selected[index] && currentSelected >= this.maxSelections) {
            return;
        }

        this.selected[index] = !this.selected[index];

        this.optionButtons[index].setFillStyle(
            this.selected[index] ? 0x46235e : 0x2f2d42
        );

        const selectedCount = this.selected.filter((s) => s).length;
        this.counterText.setText(
            `Selected: ${selectedCount}/${this.maxSelections}`
        );
    }

    private restartGame() {
        this.selected = [];
        this.optionButtons = [];
        this.optionTexts = [];
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(
            Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            () => {
                this.scene.restart();
            }
        );
    }

    private layout = () => {
        const w = this.scale.width;
        const h = this.scale.height;

        const scaleX = Math.floor(w / this.background.width);
        const scaleY = Math.floor(h / this.background.height);
        const scale = Math.min(scaleX, scaleY);

        this.background.setScale(scale);
        this.background.setPosition(w / 2, h / 2);

        // Position settings button in top right
        this.settingsButton.setPosition(w - 50, 30);
        this.settingsText.setPosition(w - 50, 30);

        if (this.minigameTerminal) {
            this.minigameTerminal.setScale(scale * 0.75);
            this.minigameTerminal.setPosition(w / 2, h / 2);

            const terminalScale =
                Math.min(
                    w / this.minigameTerminal.width,
                    h / this.minigameTerminal.height
                ) * 0.75;
            this.minigameTerminal.setScale(terminalScale);
            this.minigameTerminal.setPosition(w / 2, h / 2);

            const terminalWidth = this.minigameTerminal.displayWidth;
            const terminalHeight = this.minigameTerminal.displayHeight;

            const terminalX = this.minigameTerminal.x - terminalWidth / 2;
            const terminalY = this.minigameTerminal.y - terminalHeight / 2;

            if (this.progressBar) {
                this.progressBar.setScale(terminalScale);
                this.progressBar.setPosition(
                    terminalX + terminalWidth * 0.5,
                    terminalY + terminalHeight * 0.1
                );
            }

            if (this.counterText) {
                this.counterText.setPosition(
                    terminalX + terminalWidth * 0.85,
                    terminalY + terminalHeight * 0.9
                );
            }

            if (this.promptText) {
                this.promptText.setPosition(
                    this.minigameTerminal.x,
                    terminalY + terminalHeight * 0.3
                );
                this.promptText.setStyle({
                    wordWrap: { width: terminalWidth * 0.8 },
                });
            }

            if (this.submitContainer) {
                this.submitContainer.setPosition(
                    this.minigameTerminal.x,
                    terminalY + terminalHeight * 0.75
                );
            }
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

    private cleanup() {
        const canvas = this.game.canvas as HTMLCanvasElement;
        if (canvas && this.canvasClickHandler) {
            canvas.removeEventListener("click", this.canvasClickHandler);
            this.canvasClickHandler = undefined;
        }

        if (this.terminalContainer) {
            this.terminalContainer.destroy();
        }

        if (this.cutsceneOverlay) {
            this.cutsceneOverlay.destroy();
        }

        if (this.cutsceneText) {
            this.cutsceneText.destroy();
        }

        if (this.settingsButton) {
            this.settingsButton.destroy();
        }

        if (this.focusIndicator) {
            this.focusIndicator.destroy();
        }

        if (this.settingsText) {
            this.settingsText.destroy();
        }

        if (this.pauseOverlay) {
            this.pauseOverlay.destroy();
        }

        if (this.pauseMenu) {
            this.pauseOverlay.destroy();
        }

        if (this.minigameTerminal) {
            this.minigameTerminal.destroy();
        }

        if (this.progressBar) {
            this.progressBar.destroy();
        }

        if (this.background) {
            this.background.destroy();
        }

        if (this.promptText) {
            this.promptText.destroy();
        }

        if (this.counterText) {
            this.counterText.destroy();
        }

        if (this.submitContainer) {
            this.submitContainer.destroy();
        }

        if (this.winnerText) {
            this.winnerText.destroy();
        }

        if (this.gameOverText) {
            this.gameOverText.destroy();
        }

        this.currentProgress = 0;
        this.optionButtons = [];
        this.optionTexts = [];
        this.selected = [];

        this.scale.off("resize", this.layout, this);
        this.input.keyboard?.off("keydown-Q");
    }

    private createSettingsButton() {
        this.settingsButton = this.add
            .rectangle(0, 0, 80, 40, 0x333333)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.togglePauseMenu())
            .on("pointerover", () => this.settingsButton.setFillStyle(0x444444))
            .on("pointerout", () => this.settingsButton.setFillStyle(0x333333))
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

    private createPauseMenu() {
        // Semi-transparent overlay
        this.pauseOverlay = this.add
            .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.5)
            .setOrigin(0, 0)
            .setDepth(15000);

        // Menu container
        this.pauseMenu = this.add.container(
            this.scale.width / 2,
            this.scale.height / 2
        );
        this.pauseMenu.setDepth(15001);

        // Menu background
        const menuBg = this.add
            .rectangle(0, 0, 300, 200, 0x222222)
            .setStrokeStyle(2, 0xffffff);
        this.pauseMenu.add(menuBg);

        // Menu title
        const title = this.add
            .text(0, -70, "Pause Menu", {
                fontFamily: "Arial Black",
                fontSize: "24px",
                color: "#ffffff",
            })
            .setOrigin(0.5);
        this.pauseMenu.add(title);

        // Resume button
        const resumeBtn = this.add
            .rectangle(0, -20, 200, 40, 0x0070f3)
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

        // Restart button
        const restartBtn = this.add
            .rectangle(0, 30, 200, 40, 0x0070f3)
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

        // Level Select button
        const levelSelectBtn = this.add
            .rectangle(0, 80, 200, 40, 0x0070f3)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.scene.start("LevelSelect"));
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
        this.scene.restart();
    }
}

