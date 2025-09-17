import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { SaveMenu } from './scenes/SaveMenu';
import { CardGame } from './scenes/CardGame';
import { LevelSelect } from './scenes/LevelSelect';
import { OptionsMenu } from './scenes/OptionsMenu';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
	type: AUTO,
	width: 1024,
	height: 768,
	parent: 'game-container',
	backgroundColor: '#028af8',
	scale: {
		mode: Phaser.Scale.RESIZE,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	scene: [
		Boot,
		Preloader,
		MainMenu,
		SaveMenu,
		LevelSelect,
		OptionsMenu,
		MainGame,
		GameOver,
		CardGame,
	]
};

const StartGame = (parent: string) => {

	return new Game({ ...config, parent });

}

export default StartGame;
