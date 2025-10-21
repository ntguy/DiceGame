import { StartScene } from './StartScene.js';
import { GameScene } from './GameScene.js';

const GAME_WIDTH = 1100;
const HEADER_HEIGHT = 40;
const CONTENT_HEIGHT = 700;
const GAME_HEIGHT = CONTENT_HEIGHT + HEADER_HEIGHT;

// Game constants
export const CONSTANTS = {
    HEADER_HEIGHT,
    DIE_SIZE: 60,
    GRID_Y: 500,
    SLOT_SPACING: 80, // dieSize + 20
    SLOT_START_X: 175,
    BUTTONS_Y: 630,
    RESOLVE_TEXT_Y: 250,
    DICE_PER_SET: 6,
    DEFAULT_MAX_ROLLS: 3,
    DEFAULT_ZONE_WIDTH: 370,
    DEFAULT_SFX_VOLUME: 0.6,
    UI_MARGIN: 20,
    RIGHT_COLUMN_X: GAME_WIDTH - 40,
    COMBO_TABLE_TOP_Y: 160,
    RELIC_INFO_TITLE_Y: CONTENT_HEIGHT - 200,
    RELIC_INFO_WRAP_WIDTH: 320,
    RELIC_TRAY_Y: CONTENT_HEIGHT - 40,
    RELIC_ICON_SPACING: 56,
    RELIC_ICON_SIZE: 48,
    RELIC_ICON_FONT_SIZE: '28px',
    RELIC_MAX_SLOTS: 6,
    EMOJI_TEXT_PADDING: { top: 6, bottom: 6 }
};

// Game configuration
export const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#222",
    scene: [StartScene, GameScene],
    render: {
        pixelArt: true,
        antialias: false
    }
};
