export interface GridConfiguration {
    x: number;
    y: number;
    paddingX: number;
    paddingY: number;
};

export type EntityType = "User" | "Sidekick" | "Narrator" | "EnemySleep_Level_1" | "EnemyAwake_Level_1";

export type Dialogue = {
    speaker: EntityType,
    line: string,
};

export type TextBoxAssets = {
    entityAsset: string,
    boxAsset: string,
};

export interface CreateCardConfig {
    scene: Phaser.Scene;
    x: number;
    y: number;
    frontTexture: string;
    backTexture: string;
    cardName: string;
    animationKey: string;
    allAnimationKeys: string[];
    hallucinationChance: number;
}

export interface CardObject {
    gameObject: Phaser.GameObjects.Container;
    flip: (isHallucinate:boolean, callbackComplete?: () => void) => void;
    destroy: () => void;
    cardName: string;
    hasFaceAt: (x: number, y: number) => boolean;
    isFaceDown: () => boolean;
}

export type TrainingPromptOption = {
    word: string;
    weight: number;
}

export type TrainingPrompt = {
    id: number;
    prompt_text: string;
    options: TrainingPromptOption[];
}