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
    DEFAULT_ZONE_WIDTH: 370,
    RIGHT_UI_X: 1070,
    COMBO_TABLE_Y: 250,
    RELIC_INFO_Y: 470,
    RELIC_TRAY_Y: 640,
    RELIC_SPACING: 56,
    RELIC_ICON_SIZE: 44,
    RELIC_ICON_FONT: 28,
    UI_MARGIN: 16
};

// Game configuration
export const config = {
    type: Phaser.AUTO,
    width: 1100,
    height: 700,
    backgroundColor: "#222",
    scene: [GameScene]
};