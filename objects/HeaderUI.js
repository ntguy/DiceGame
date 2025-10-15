import { CONSTANTS } from '../config.js';
import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

function createHeaderButton(scene, {
    label,
    x,
    origin,
    onClick
}) {
    const button = scene.add.text(x, CONSTANTS.HEADER_HEIGHT / 2, label, {
        fontSize: '24px',
        color: '#ecf0f1',
        padding: { x: 14, y: 8 }
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
        onClick: () => scene.toggleMenu()
    });

    const settingsButton = createHeaderButton(scene, {
        label: '⚙',
        x: menuButton.x - menuButton.displayWidth - buttonSpacing,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleSettings()
    });

    const instructionsButton = createHeaderButton(scene, {
        label: '📘',
        x: settingsButton.x - settingsButton.displayWidth - buttonSpacing,
        origin: { x: 1, y: 0.5 },
        onClick: () => scene.toggleInstructions()
    });

    const layoutButtons = () => {
        const menuX = headerWidth - CONSTANTS.UI_MARGIN;
        menuButton.setX(menuX);
        const settingsX = menuX - menuButton.displayWidth - buttonSpacing;
        settingsButton.setX(settingsX);
        const instructionsX = settingsX - settingsButton.displayWidth - buttonSpacing;
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
