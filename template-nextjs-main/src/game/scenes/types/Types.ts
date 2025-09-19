export interface GridConfiguration {
    x: number;
    y: number;
    paddingX: number;
    paddingY: number;
};

export type EntityType = "User" | "Sidekick" | "Narrator" | "CardEnemy";

export type Dialogue = {
    speaker: EntityType,
    line: string,
};

export type TextBoxAssets = {
    entityAsset: string,
    boxAsset: string,
};