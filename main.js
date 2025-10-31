// import { GameScene } from './scenes/GameScene.js';
import { initializePixelText } from './utils/pixelText.js';
import { config } from './config.js';

initializePixelText();

// Initialize the game with configuration
const game = new Phaser.Game(config);
