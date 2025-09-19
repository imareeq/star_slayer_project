import { useRef, useState } from "react";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { MainMenu } from "./game/scenes/MainMenu";

function App() {
    // The sprite can only be moved in the MainMenu Scene
    const [canMoveSprite, setCanMoveSprite] = useState(true);

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [spritePosition, setSpritePosition] = useState({ x: 0, y: 0 });

    const changeScene = () => {
        if (phaserRef.current) {
            const scene = phaserRef.current.scene as MainMenu;

            if (scene) {
                scene.changeScene();
            }
        }
    };

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {
        setCanMoveSprite(scene.scene.key !== "MainMenu");
    };

    return (
        <div id="app">
            {window.innerWidth < 900 && window.innerHeight < 900 ? (
                <p>Screen Size not supported in current version. We are working on it. Minimum Size: 1920 x 1080. Please try again from a desktop.</p>
            ) : (
                <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            )}

            <div>
                {/* <div>
                    <button className="button" onClick={changeScene}>Change Scene</button>
                </div>
                <div>
                    <button disabled={canMoveSprite} className="button" onClick={moveSprite}>Toggle Movement</button>
                </div>
                <div className="spritePosition">Sprite Position:
                    <pre>{`{\n  x: ${spritePosition.x}\n  y: ${spritePosition.y}\n}`}</pre>
                </div>
                <div>
                    <button className="button" onClick={addSprite}>Add New Sprite</button>
                </div> */}
            </div>
        </div>
    );
}

export default App;

