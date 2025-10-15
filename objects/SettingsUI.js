import { CONSTANTS } from '../config.js';
import { applyRectangleButtonStyle, applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

export function createSettingsUI(scene) {
    const panelWidth = scene.scale.width * 0.28;
    const panelHeight = scene.scale.height;
    const panelX = scene.scale.width - panelWidth;
    const padding = 24;
    const sectionWidth = panelWidth - padding * 2;

    if (scene.settingsButton) {
        scene.settingsButton.destroy();
        scene.settingsButton = null;
    }

    const buttonOffset = 12;
    const buttonY = scene.menuButton
        ? scene.menuButton.y - scene.menuButton.displayHeight - buttonOffset
        : scene.scale.height - CONSTANTS.UI_MARGIN - buttonOffset;

    const settingsButton = scene.add.text(CONSTANTS.UI_MARGIN, buttonY, '⚙', {
        fontSize: '26px',
        color: '#ecf0f1',
        padding: { x: 18, y: 10 }
    }).setOrigin(0, 1);
    settingsButton.setDepth(70);
    applyTextButtonStyle(settingsButton, {
        baseColor: '#2c3e50',
        textColor: '#ecf0f1',
        hoverBlend: 0.18,
        pressBlend: 0.28,
        disabledBlend: 0.42
    });
    setTextButtonEnabled(settingsButton, true);
    settingsButton.on('pointerdown', () => scene.toggleSettings());
    scene.settingsButton = settingsButton;

    if (scene.settingsPanel) {
        scene.settingsPanel.destroy(true);
        scene.settingsPanel = null;
    }

    const settingsPanel = scene.add.container(panelX, 0);
    settingsPanel.setDepth(80);

    const panelBg = scene.add.rectangle(panelWidth / 2, panelHeight / 2, panelWidth, panelHeight, 0x101820, 0.95)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, 0.08)
        .setInteractive();
    settingsPanel.add(panelBg);

    const headerText = scene.add.text(panelWidth / 2, 24, 'Settings', {
        fontSize: '32px',
        color: '#76d7c4',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    settingsPanel.add(headerText);

    const contentTop = 90;
    const contentHeight = 200;
    const contentCenterY = contentTop + contentHeight / 2;

    const settingsBg = scene.add.rectangle(panelWidth / 2, contentCenterY, sectionWidth, contentHeight, 0x232d3b, 0.92)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0x76d7c4, 0.18);
    settingsPanel.add(settingsBg);

    const muteButtonY = contentTop + 52;
    const toggleSpacing = 64;

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
    settingsPanel.add(scene.muteButton);

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
    settingsPanel.add(scene.testingModeButton);

    const closeButtonHeight = 58;
    const closeButtonMargin = 32;
    const closeButtonY = panelHeight - closeButtonMargin - closeButtonHeight / 2;

    scene.settingsCloseButton = scene.add.rectangle(panelWidth / 2, closeButtonY, sectionWidth, closeButtonHeight, 0x2d1b3d, 0.92)
        .setInteractive({ useHandCursor: true });
    applyRectangleButtonStyle(scene.settingsCloseButton, {
        baseColor: 0x2d1b3d,
        baseAlpha: 0.92,
        hoverBlend: 0.18,
        pressBlend: 0.32,
        disabledBlend: 0.5,
        enabledAlpha: 1,
        disabledAlpha: 0.45
    });
    scene.settingsCloseButton.on('pointerup', () => scene.closeSettings());
    settingsPanel.add(scene.settingsCloseButton);

    const closeText = scene.add.text(panelWidth / 2, closeButtonY, 'Close Settings', {
        fontSize: '24px',
        color: '#f9e79f'
    }).setOrigin(0.5);
    settingsPanel.add(closeText);

    settingsPanel.setVisible(false);
    scene.settingsPanel = settingsPanel;
    scene.isSettingsOpen = false;
    scene.updateSettingsButtonLabel();
    scene.updateMuteButtonState();
    scene.updateTestingModeButtonState();
}
