import { GameObjects, Scene } from "phaser";
import { EventBus } from "../EventBus";
import { DialogueEngine } from "./DialogueEngine";
import { Dialogue } from "./types/Types";

export class DataTrainingGame extends Scene {
    background: GameObjects.Image;
    private buttons: Phaser.GameObjects.Rectangle[] = [];
    private focusIndex: number = -1;
    private focusIndicator!: Phaser.GameObjects.Rectangle;
    private canvasClickHandler?: (ev: MouseEvent) => void;
    private terminalContainer!: Phaser.GameObjects.Container;
    private cutsceneOverlay!: Phaser.GameObjects.Rectangle;
    private cutsceneText!: Phaser.GameObjects.Text;

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
            line: "Hang in there! I'll do my best!"
        },
        {
            speaker: "Narrator",
            line: "Click to begin..."
        }
    ];

    private settingsButton!: Phaser.GameObjects.Rectangle;
    private settingsText!: Phaser.GameObjects.Text;
    private pauseOverlay!: Phaser.GameObjects.Rectangle;
    private pauseMenu!: Phaser.GameObjects.Container;
    private isPaused: boolean = false;

    init() {
        this.cameras.main.fadeIn(500);
        // TODO: needs a timer
    }

    constructor() {
        super("DataTrainingGame");
    }

    preload() {
        this.load.image("training-bg", "assets/training_game/training_lore_bg.png");
        this.load.image("training-terminal", "assets/training_game/training_terminal_bg.png");
        this.load.image("player", "assets/Player.png");
        this.load.image("sidekick", "assets/Sidekick.png");
        this.load.image("dialogue-box-left", "assets/DialogueBoxLeft.png");
        this.load.image("dialogue-box-right", "assets/DialogueBoxRight.png");
    }

    create() {
        this.events.once("shutdown", this.cleanup, this);
        this.background = this.add.image(0, 0, "training-bg");

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
                console.log("Canvas focused via click (CardGame)");
            };
            canvas.addEventListener("click", this.canvasClickHandler);
        }

        this.input.keyboard?.on("keydown-Q", () => {
            this.togglePauseMenu();
        });

        this.layout();
        this.scale.on("resize", this.layout, this);

        const cutsceneEngine: DialogueEngine = new DialogueEngine(
            this,
            this.cutsceneLines
        );

        cutsceneEngine.start();

        EventBus.emit("current-scene-ready", this);
    }

    private showTerminal() {
        const overlay = this.add
            .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.6)
            .setOrigin(0);

        const terminal = this.add
            .image(this.scale.width / 2, this.scale.height / 2, "terminal-bg")
            .setOrigin(0.5);

        // Wrap everything in a container
        this.terminalContainer = this.add.container(0, 0, [overlay, terminal]);
    }

    private hideTerminal() {
        this.terminalContainer.destroy(true);
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
            canvas.removeEventListener("click", this.canvasClickHandler);
            this.canvasClickHandler = undefined;
        }
        this.isPaused = false;
        this.scale.off("resize", this.layout, this);
        this.input.keyboard?.off("keydown-Q");
    }
}

