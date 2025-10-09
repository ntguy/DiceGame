import { GameScene } from './GameScene.js';

const GAME_WIDTH = 1100;
const GAME_HEIGHT = 700;

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
    UI_MARGIN: 20,
    RIGHT_COLUMN_X: GAME_WIDTH - 30,
    COMBO_TABLE_TOP_Y: 210,
    RELIC_INFO_TITLE_Y: GAME_HEIGHT - 200,
    RELIC_INFO_WRAP_WIDTH: 320,
    RELIC_TRAY_Y: GAME_HEIGHT - 40,
    RELIC_ICON_SPACING: 56,
    RELIC_ICON_SIZE: 48,
    RELIC_ICON_FONT_SIZE: '28px'
};

// Game configuration
export const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#222",
    scene: [GameScene]
};
