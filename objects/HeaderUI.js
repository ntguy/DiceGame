import { CONSTANTS } from '../config.js';
import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

const DEFAULT_BUTTON_WIDTH = 72;
const DEFAULT_BUTTON_HEIGHT = 40;

function createHeaderButton(scene, {
    label,
    x,
    origin,
    onClick,
    fontSize = '32px',
    width = DEFAULT_BUTTON_WIDTH
}) {
    const button = scene.add.text(x, CONSTANTS.HEADER_HEIGHT / 2, label, {
        fontSize,
        color: '#ecf0f1',
        padding: { x: 18, y: 6 },
        align: 'center'
    }).setOrigin(origin.x, origin.y);

    applyTextButtonStyle(button, {
        baseColor: '#2c3e50',
        textColor: '#ecf0f1',
        hoverBlend: 0.18,
        pressBlend: 0.28,
        disabledBlend: 0.42,
        background: {
            paddingX: 32,
            paddingY: 20,
            baseColor: '#1c2734',
            baseAlpha: 0.92,
            strokeColor: '#0a121a',
            strokeAlpha: 0.55,
            strokeWidth: 2
        }
    });
    setTextButtonEnabled(button, true);
    button.on('pointerdown', onClick);
    button.setScrollFactor(0);

    button.setFixedSize(width, DEFAULT_BUTTON_HEIGHT);
    button.setData('buttonWidth', width);
    button.setData('buttonHeight', DEFAULT_BUTTON_HEIGHT);

    return button;
}

export function createHeaderUI(scene) {
    if (scene.headerContainer) {
        scene.headerContainer.destroy(true);
        scene.headerContainer = null;
    }

    const headerWidth = scene.scale.width;
    const headerHeight = CONSTANTS.HEADER_HEIGHT;
    const buttonSpacing = 16;

    const container = scene.add.container(0, 0);
    container.setDepth(100);
    container.setScrollFactor(0);

    const background = scene.add.rectangle(
        headerWidth / 2,
        headerHeight / 2,
        headerWidth,
        headerHeight,
        0x101820,
        0.96
    ).setOrigin(0.5)
        .setStrokeStyle(1, 0xffffff, 0.12);
    background.setScrollFactor(0);
    container.add(background);

    const goldText = scene.add.bitmapText(
        CONSTANTS.UI_MARGIN,
        headerHeight / 2,
        'boldPixels',
        '',
        32
    ).setOrigin(0, 0.5);
    goldText.setTint(0xf1c40f);
    goldText.setScrollFactor(0);
    container.add(goldText);

    const mapTitleText = scene.add.text(headerWidth / 2, headerHeight / 2, '', {
        fontSize: '20px',
        color: '#ecf0f1'
    }).setOrigin(0.5, 0.5);
    mapTitleText.setScrollFactor(0);
    container.add(mapTitleText);

    const menuButton = createHeaderButton(scene, {
        label: '☰',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleMenu(),
        fontSize: '32px'
    });
    menuButton.setData('defaultFontSize', '32px');
    menuButton.setData('expandedFontSize', '32px');

    const backpackButton = createHeaderButton(scene, {
        label: '🎒',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleBackpack(),
        fontSize: '32px'
    });

    const settingsButton = createHeaderButton(scene, {
        label: '⚙',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleSettings(),
        fontSize: '32px'
    });
    settingsButton.setData('defaultFontSize', '32px');
    settingsButton.setData('expandedFontSize', '32px');

    const instructionsButton = createHeaderButton(scene, {
        label: '📘',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleInstructions()
    });

    const layoutButtons = () => {
        const currentHeaderWidth = scene && scene.scale && typeof scene.scale.width === 'number'
            ? scene.scale.width
            : headerWidth;
        const menuX = currentHeaderWidth - CONSTANTS.UI_MARGIN;
        menuButton.setX(menuX);

        let nextX = menuX;

        const positionButton = button => {
            if (!button) {
                return;
            }
            const state = button.getData && button.getData('textButtonStyle');
            const backgroundWidth = state && state.backgroundRect
                ? (state.backgroundRect.displayWidth || state.backgroundRect.width || 0)
                : 0;
            const storedWidth = button.getData && button.getData('buttonWidth');
            const textWidth = typeof button.displayWidth === 'number'
                ? button.displayWidth
                : (typeof button.width === 'number' ? button.width : DEFAULT_BUTTON_WIDTH);
            const width = Math.max(backgroundWidth, storedWidth || 0, textWidth, DEFAULT_BUTTON_WIDTH);
            nextX -= width + buttonSpacing;
            button.setX(nextX);
        };

        positionButton(settingsButton);
        positionButton(instructionsButton);
        positionButton(backpackButton);
    };
    layoutButtons();

    container.add(menuButton);
    container.add(backpackButton);
    container.add(settingsButton);
    container.add(instructionsButton);

    scene.headerContainer = container;
    scene.menuButton = menuButton;
    scene.backpackButton = backpackButton;
    scene.settingsButton = settingsButton;
    scene.instructionsButton = instructionsButton;
    scene.layoutHeaderButtons = layoutButtons;
    scene.mapTitleText = mapTitleText;
    scene.goldText = goldText;

    if (typeof scene.updateMapSkipButtonState === 'function') {
        scene.updateMapSkipButtonState();
    }
}
