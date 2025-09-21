import { EventBus } from "../EventBus";
import { Dialogue, EntityType, TextBoxAssets } from "./types/Types";

export class DialogueEngine {
    private scene: Phaser.Scene;
    private lines: Dialogue[];
    private currDialogueIndex: number;
    private currDialogueBox: Phaser.GameObjects.Image;
    private textBox: Phaser.GameObjects.Container;
    private overlay: Phaser.GameObjects.Rectangle;

    private dialogueAssetMap: Record<EntityType, TextBoxAssets> = {
        User: { entityAsset: "player", boxAsset: "dialogue-box-left" },
        Sidekick: { entityAsset: "sidekick", boxAsset: "dialogue-box-right" },
        Narrator: { entityAsset: "", boxAsset: "dialogue-box-left" },
        EnemySleep_Level_1: { entityAsset: "card-enemy-sleep", boxAsset: "dialogue-box-right", },
        EnemyAwake_Level_1 : {entityAsset: "card-enemy-awake", boxAsset: "dialogue-box-right", },

    };

    constructor(scene: Phaser.Scene, lines: Dialogue[]) {
        this.scene = scene;
        this.lines = lines;
        this.currDialogueIndex = 0;
        this.scene.events.once("shutdown", this.cleanup, this);
    }

    start() {
        this.overlay = this.scene.add
            .rectangle(
                0,
                0,
                this.scene.scale.width,
                this.scene.scale.height,
                0x000000,
                0.0
            )
            .setOrigin(0, 0)
            .setDepth(5000)
            .setInteractive();

        this.showNextLine();
    }

    private showNextLine() {
        if (this.currDialogueIndex >= this.lines.length) {
            this.scene.tweens.add({
                targets: this.textBox,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.cleanup();
                    this.scene.events.emit("dialogueComplete");
                },
            });
            return;
        }

        const line = this.lines[this.currDialogueIndex];

        if (this.textBox) {
            this.textBox.destroy(true);
        }

        const padding = 15;
        const screenWidth = this.scene.scale.width;
        const screenHeight = this.scene.scale.height;

        const charAsset =
            this.dialogueAssetMap[line.speaker]?.entityAsset || "";
        const boxAsset =
            this.dialogueAssetMap[line.speaker]?.boxAsset ||
            "dialogue-box-left";

        const dialogueBox = this.scene.add
            .image(0, 0, boxAsset)
            .setOrigin(0.5, 1);

        const targetBoxWidth = screenWidth * 0.6;
        const boxScale = targetBoxWidth / dialogueBox.width;
        dialogueBox.setScale(boxScale);

        const charImage = charAsset
            ? this.scene.add.image(0, 0, charAsset).setOrigin(0.5, 1)
            : null;

        if (charImage) {
            const charScale = dialogueBox.displayHeight / charImage.height;
            charImage.setScale(charScale);
        }

        const dialogueText = this.scene.add
            .text(0, 0, line.line, {
                fontSize: "16px",
                color: "#ffffff",
                wordWrap: { width: dialogueBox.displayWidth - padding * 2 },
            })
            .setOrigin(0.5, 0.5);

        this.textBox = this.scene.add.container(0, 0).setDepth(5001);
        if (charImage) {
            this.textBox.add(charImage);
        }
        this.textBox.add(dialogueBox);
        this.textBox.add(dialogueText);

        if (line.speaker === "Sidekick" || line.speaker === "EnemySleep_Level_1" || line.speaker === "EnemyAwake_Level_1") {
            const charX =
                screenWidth -
                padding -
                (charImage ? charImage.displayWidth / 2 : 0);
            const boxX =
                charX -
                (charImage ? charImage.displayWidth / 2 : 0) -
                dialogueBox.displayWidth / 2 -
                padding;

            const boxY = screenHeight - padding;

            dialogueBox.setPosition(boxX, boxY);

            if (charImage) {
                charImage.setPosition(charX, screenHeight - padding);
            }

            dialogueText.setPosition(
                boxX,
                boxY - dialogueBox.displayHeight / 2
            );
        } else if (line.speaker === "User") {
            const charX =
                padding + (charImage ? charImage.displayWidth / 2 : 0);
            const boxX =
                charX +
                (charImage ? charImage.displayWidth / 2 : 0) +
                dialogueBox.displayWidth / 2 +
                padding;

            const boxY = screenHeight - padding;

            if (charImage) {
                charImage.setPosition(charX, boxY);
            }

            dialogueBox.setPosition(boxX, boxY);
            dialogueText.setPosition(
                boxX,
                boxY - dialogueBox.displayHeight / 2
            );
        } else {
            const boxX = screenWidth / 2;
            const boxY = screenHeight - padding;

            dialogueBox.setPosition(boxX, boxY);
            dialogueText.setPosition(
                boxX,
                boxY - dialogueBox.displayHeight / 2
            );
        }

        this.overlay.once("pointerdown", () => {
            this.currDialogueIndex++;
            this.showNextLine();
        });
    }

    private cleanup() {
        if (this.overlay) {
            this.overlay.destroy();
        }
        if (this.textBox) {
            this.textBox.destroy(true);
        }
        this.currDialogueIndex = 0;
    }
}
