import Phaser from 'phaser';
import { CardObject, CreateCardConfig } from './scenes/types/Types';



export const createCard = ({
    scene,
    x,
    y,
    frontTexture,
    backTexture,
    cardName,
    animationKey,
    allAnimationKeys,
    hallucinationChance
}: CreateCardConfig): CardObject => {
    let isFlipping: boolean = false;
    let isFaceUp: boolean = false;
    let lastPlayedAnimationKey = animationKey;

    // --- Card and Animation Dimensions ---
    const cardWidth = 48;
    const cardHeight = 72;
    const animationFrameWidth = 32;

    // --- Create Game Objects ---
    const container = scene.add.container(x, y);
    container.setSize(cardWidth, cardHeight);
    container.setInteractive();

    const backCard = scene.add.sprite(0, 0, backTexture);
    const frontCard = scene.add.sprite(0, 0, frontTexture).setVisible(false);
    const openAnimation = scene.add.sprite(0, 0, '').setVisible(false);

    backCard.setOrigin(0.5);
    frontCard.setOrigin(0.5);
    openAnimation.setOrigin(0.5);

    container.add([backCard, frontCard, openAnimation]);

    const requiredScale = cardWidth / animationFrameWidth;
    openAnimation.setScale(requiredScale);

    const flip = (isHallucinate:boolean,callbackComplete?: () => void): void => {
        if (isFlipping) {
            return;
        }
        isFlipping = true;

        const originalScaleX = container.scaleX;

        if (!isFaceUp) {
            // --- FLIPPING TO THE FRONT ---
            scene.tweens.add({
                targets: container,
                scaleX: 0,
                duration: 200,
                ease: 'Linear',
                onComplete: () => {
                    backCard.setVisible(false);
                    frontCard.setVisible(true);

                    scene.tweens.add({
                        targets: container,
                        scaleX: originalScaleX,
                        duration: 200,
                        ease: 'Linear',
                        onComplete: () => {
                            openAnimation.setVisible(true);

                            const willHallucinate = Math.random() < hallucinationChance;
                            if (willHallucinate && allAnimationKeys.length > 1 && isHallucinate) {
                                let hallucinationKey = animationKey;
                                do {
                                    hallucinationKey = Phaser.Utils.Array.GetRandom(allAnimationKeys);
                                } while (hallucinationKey === animationKey);

                                lastPlayedAnimationKey = hallucinationKey;
                                openAnimation.play(hallucinationKey);
                            } else {
                                lastPlayedAnimationKey = animationKey;
                                openAnimation.play(animationKey);
                            }
                        }
                    });
                }
            });

            openAnimation.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                isFlipping = false;
                isFaceUp = true;
                if (callbackComplete) {
                    callbackComplete();
                }
            });
        } else {
            // --- FLIPPING TO THE BACK ---
            openAnimation.playReverse(lastPlayedAnimationKey);

            openAnimation.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                openAnimation.setVisible(false);

                scene.tweens.add({
                    targets: container,
                    scaleX: 0,
                    duration: 200,
                    ease: 'Linear',
                    onComplete: () => {
                        frontCard.setVisible(false);
                        backCard.setVisible(true);

                        scene.tweens.add({
                            targets: container,
                            scaleX: originalScaleX,
                            duration: 200,
                            ease: 'Linear',
                            onComplete: () => {
                                isFlipping = false;
                                isFaceUp = false;
                                if (callbackComplete) {
                                    callbackComplete();
                                }
                            }
                        });
                    }
                });
            });
        }
    };

    const destroy = (): void => {
        scene.tweens.add({
            targets: container,
            y: container.y - 1000,
            ease: 'Expo.In',
            duration: 700,
            onComplete: () => {
                container.destroy();
            }
        });
    };

    const hasFaceAt = (x: number, y: number): boolean => {
        const bounds = container.getBounds();
        return Phaser.Geom.Rectangle.Contains(bounds, x, y);
    };

    const isFaceDown = (): boolean => {
        return !isFaceUp;
    };

    return {
        gameObject: container,
        flip,
        destroy,
        cardName,
        hasFaceAt,
        isFaceDown
    };
};
