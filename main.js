// import { GameScene } from './scenes/GameScene.js';
import './utils/bitmapTextFactory.js';
import { config } from './config.js';

// Initialize the game with configuration
const game = new Phaser.Game(config);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((registrationError) => {
        console.error('Service worker registration failed:', registrationError);
      });
  });
}
