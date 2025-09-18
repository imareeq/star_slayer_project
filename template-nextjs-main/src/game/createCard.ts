import Phaser from 'phaser';

interface CreateCardConfig {
    scene: Phaser.Scene;
    x: number;
    y: number;
    frontTexture: string;
    cardName: string;
}

export interface CardObject {
    gameObject: Phaser.GameObjects.Plane;
    flip: (callbackComplete?: () => void) => void;
    destroy: () => void;
    cardName: string;
}

export const createCard = ({
    scene,
    x,
    y,
    frontTexture,
    cardName
}: CreateCardConfig): CardObject => {
    let isFlipping: boolean = false;
    const rotation: { y: number } = { y: 0 };
    const backTexture: string = "card-back";

    const card: Phaser.GameObjects.Plane = scene.add.plane(x, y, backTexture)
        .setName(cardName)
        .setInteractive();

    // Start with the card face down
    card.modelRotation.y = 180;

    const flipCard = (callbackComplete?: () => void): void => {
        if (isFlipping) {
            return;
        }
        scene.add.tween({
            targets: [rotation],
            y: rotation.y === 180 ? 0 : 180,
            ease: Phaser.Math.Easing.Expo.Out,
            duration: 500,
            onStart: () => {
                isFlipping = true;
                // scene.sound.play("card-flip");
                scene.tweens.chain({
                    targets: card,
                    ease: Phaser.Math.Easing.Expo.InOut,
                    tweens: [
                        {
                            duration: 200,
                            scale: 1.1,
                        },
                        {
                            duration: 300,
                            scale: 1
                        },
                    ]
                });
            },
            onUpdate: () => {
                card.modelRotation.y = 180 + rotation.y;
                const cardRotation: number = Math.floor(card.modelRotation.y) % 360;
                if ((cardRotation >= 0 && cardRotation <= 90) || (cardRotation >= 270 && cardRotation <= 359)) {
                    card.setTexture(frontTexture);
                } else {
                    card.setTexture(backTexture);
                }
            },
            onComplete: () => {
                isFlipping = false;
                if (callbackComplete) {
                    callbackComplete();
                }
            }
        });
    };

    const destroy = (): void => {
        scene.add.tween({
            targets: [card],
            y: card.y - 1000,
            easing: Phaser.Math.Easing.Elastic.In,
            duration: 500,
            onComplete: () => {
                card.destroy();
            }
        });
    };

    return {
        gameObject: card,
        flip: flipCard,
        destroy,
        cardName
    };
};