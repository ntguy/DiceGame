import { CONSTANTS } from '../config.js';
import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

const DEFAULT_BUTTON_WIDTH = 72;
const DEFAULT_BUTTON_HEIGHT = 40;

function createHeaderButton(scene, {
    label,
    x,
    origin,
    onClick,
    fontSize = '24px',
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
        disabledBlend: 0.42
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
    const buttonSpacing = 12;

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

    const mapTitleText = scene.add.text(CONSTANTS.UI_MARGIN, headerHeight / 2, '', {
        fontSize: '20px',
        color: '#ecf0f1'
    }).setOrigin(0, 0.5);
    mapTitleText.setScrollFactor(0);
    container.add(mapTitleText);

    const menuButton = createHeaderButton(scene, {
        label: '☰',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleMenu(),
        fontSize: '28px'
    });
    menuButton.setData('defaultFontSize', '24px');
    menuButton.setData('expandedFontSize', '28px');

    const settingsButton = createHeaderButton(scene, {
        label: '⚙',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleSettings(),
        fontSize: '28px'
    });
    settingsButton.setData('defaultFontSize', '24px');
    settingsButton.setData('expandedFontSize', '28px');

    const instructionsButton = createHeaderButton(scene, {
        label: '📘',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleInstructions()
    });

    const layoutButtons = () => {
        const menuX = headerWidth - CONSTANTS.UI_MARGIN;
        menuButton.setX(menuX);
        const settingsWidth = settingsButton.getData('buttonWidth');
        const instructionsWidth = instructionsButton.getData('buttonWidth');
        const settingsX = menuX - settingsWidth - buttonSpacing;
        settingsButton.setX(settingsX);
        const instructionsX = settingsX - instructionsWidth - buttonSpacing;
        instructionsButton.setX(instructionsX);
    };
    layoutButtons();

    container.add(menuButton);
    container.add(settingsButton);
    container.add(instructionsButton);

    scene.headerContainer = container;
    scene.menuButton = menuButton;
    scene.settingsButton = settingsButton;
    scene.instructionsButton = instructionsButton;
    scene.layoutHeaderButtons = layoutButtons;
    scene.mapTitleText = mapTitleText;
}
