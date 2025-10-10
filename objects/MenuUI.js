import { CONSTANTS } from '../config.js';
import { COMBO_POINTS } from '../systems/ComboSystem.js';
import { applyRectangleButtonStyle, applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

export function createMenuUI(scene) {
    const panelWidth = scene.scale.width * 0.28;
    const panelHeight = scene.scale.height;
    const panelX = scene.scale.width - panelWidth;
    const padding = 24;
    const sectionWidth = panelWidth - padding * 2;

    if (scene.menuButton) {
        scene.menuButton.destroy();
        scene.menuButton = null;
    }

    const menuButton = scene.add.text(CONSTANTS.UI_MARGIN, scene.scale.height - CONSTANTS.UI_MARGIN, '☰', {
        fontSize: '28px',
        color: '#ecf0f1',
        padding: { x: 18, y: 10 }
    }).setOrigin(0, 1);
    menuButton.setDepth(70);
    applyTextButtonStyle(menuButton, {
        baseColor: '#2c3e50',
        textColor: '#ecf0f1',
        hoverBlend: 0.18,
        pressBlend: 0.28,
        disabledBlend: 0.42
    });
    setTextButtonEnabled(menuButton, true);
    menuButton.on('pointerdown', () => scene.toggleMenu());
    scene.menuButton = menuButton;

    if (scene.menuPanel) {
        scene.menuPanel.destroy(true);
        scene.menuPanel = null;
    }

    const menuPanel = scene.add.container(panelX, 0);
    menuPanel.setDepth(80);

    const panelBg = scene.add.rectangle(panelWidth / 2, panelHeight / 2, panelWidth, panelHeight, 0x101820, 0.95)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, 0.08)
        .setInteractive();
    menuPanel.add(panelBg);

    const headerText = scene.add.text(panelWidth / 2, 24, 'Menu', {
        fontSize: '32px',
        color: '#f1c40f',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    menuPanel.add(headerText);

    const combos = Object.entries(COMBO_POINTS);
    const lineSpacing = 24;
    const comboContentHeight = combos.length * lineSpacing;
    const comboSectionHeight = comboContentHeight + 60;
    const comboTop = 70;

    const comboBg = scene.add.rectangle(panelWidth / 2, comboTop + comboSectionHeight / 2, sectionWidth, comboSectionHeight, 0x1f2a38, 0.92)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xf1c40f, 0.18);
    menuPanel.add(comboBg);

    const comboTitle = scene.add.text(panelWidth / 2, comboTop + 16, 'Combo Bonuses', {
        fontSize: '24px',
        color: '#f9e79f',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    menuPanel.add(comboTitle);

    const comboTextStartX = panelWidth / 2 + sectionWidth / 2 - 16;
    const comboTextStartY = comboTop + 52;
    scene.comboListTexts = combos.map(([combo, points], index) => {
        const text = scene.add.text(comboTextStartX, comboTextStartY + index * lineSpacing, `${combo}: ${points}`, {
            fontSize: '20px',
            color: '#ecf0f1'
        }).setOrigin(1, 0);
        menuPanel.add(text);
        return text;
    });

    const gapBetweenSections = 28;
    const closeButtonHeight = 58;
    const closeButtonMargin = 32;
    const closeButtonY = panelHeight - closeButtonMargin - closeButtonHeight / 2;
    const settingsBottomLimit = closeButtonY - closeButtonHeight / 2 - gapBetweenSections;
    const minSettingsHeight = 180;
    const settingsTopBase = comboTop + comboSectionHeight + gapBetweenSections;
    let settingsTop = Math.min(settingsTopBase, settingsBottomLimit - minSettingsHeight);
    settingsTop = Math.max(settingsTop, padding);
    let settingsHeight = Math.max(minSettingsHeight, settingsBottomLimit - settingsTop);
    if (settingsTop + settingsHeight > settingsBottomLimit) {
        settingsHeight = Math.max(minSettingsHeight, settingsBottomLimit - settingsTop);
    }
    if (settingsHeight < minSettingsHeight) {
        settingsHeight = minSettingsHeight;
        settingsTop = Math.max(padding, settingsBottomLimit - settingsHeight);
    }
    const settingsCenterY = settingsTop + settingsHeight / 2;

    const settingsBg = scene.add.rectangle(panelWidth / 2, settingsCenterY, sectionWidth, settingsHeight, 0x232d3b, 0.92)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0x76d7c4, 0.18);
    menuPanel.add(settingsBg);

    const settingsTitle = scene.add.text(panelWidth / 2, settingsTop + 16, 'Settings', {
        fontSize: '24px',
        color: '#76d7c4',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    menuPanel.add(settingsTitle);

    const muteButtonY = settingsTop + 74;
    const toggleSpacing = 60;

    scene.muteButton = scene.add.text(panelWidth / 2, muteButtonY, '', {
        fontSize: '22px',
        color: '#ecf0f1',
        padding: { x: 18, y: 10 }
    }).setOrigin(0.5);
    applyTextButtonStyle(scene.muteButton, {
        baseColor: '#34495e',
        textColor: '#ecf0f1',
        hoverBlend: 0.2,
        pressBlend: 0.3,
        disabledBlend: 0.45
    });
    setTextButtonEnabled(scene.muteButton, true);
    scene.muteButton.on('pointerdown', () => scene.toggleMute());
    menuPanel.add(scene.muteButton);

    const testingButtonY = muteButtonY + toggleSpacing;
    scene.testingModeButton = scene.add.text(panelWidth / 2, testingButtonY, '', {
        fontSize: '22px',
        color: '#ecf0f1',
        padding: { x: 18, y: 10 }
    }).setOrigin(0.5);
    applyTextButtonStyle(scene.testingModeButton, {
        baseColor: '#34495e',
        textColor: '#ecf0f1',
        hoverBlend: 0.2,
        pressBlend: 0.3,
        disabledBlend: 0.45
    });
    setTextButtonEnabled(scene.testingModeButton, true);
    scene.testingModeButton.on('pointerdown', () => scene.toggleTestingMode());
    menuPanel.add(scene.testingModeButton);

    scene.menuCloseButton = scene.add.rectangle(panelWidth / 2, closeButtonY, sectionWidth, 58, 0x2d1b3d, 0.92)
        .setInteractive({ useHandCursor: true });
    applyRectangleButtonStyle(scene.menuCloseButton, {
        baseColor: 0x2d1b3d,
        baseAlpha: 0.92,
        hoverBlend: 0.18,
        pressBlend: 0.32,
        disabledBlend: 0.5,
        enabledAlpha: 1,
        disabledAlpha: 0.45
    });
    scene.menuCloseButton.on('pointerup', () => scene.closeMenu());
    menuPanel.add(scene.menuCloseButton);

    const closeText = scene.add.text(panelWidth / 2, closeButtonY, 'Close Menu', {
        fontSize: '24px',
        color: '#f9e79f'
    }).setOrigin(0.5);
    menuPanel.add(closeText);

    menuPanel.setVisible(false);
    scene.menuPanel = menuPanel;
    scene.isMenuOpen = false;
    scene.updateMenuButtonLabel();
    scene.updateTestingModeButtonState();
}
