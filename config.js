import { GameScene } from './GameScene.js';

// Game constants
export const CONSTANTS = {
    DIE_SIZE: 60,
    GRID_Y: 500,
    SLOT_SPACING: 80, // dieSize + 20
    SLOT_START_X: 175,
    BUTTONS_Y: 630,
    RESOLVE_TEXT_Y: 250,
    DEFAULT_MAX_ROLLS: 3,
    DEFAULT_ZONE_WIDTH: 370
};

// Game configuration
export const config = {
    type: Phaser.AUTO,
    width: 1100,
    height: 700,
    backgroundColor: "#222",
    scene: [GameScene]
};