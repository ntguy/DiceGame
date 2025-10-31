import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';
import { createSidePanel } from './ui/SidePanelFactory.js';

export function createSettingsUI(scene) {
    if (scene.settingsPanel) {
        scene.settingsPanel.destroy(true);
        scene.settingsPanel = null;
    }

    scene.mapSkipButton = null;

    const panel = createSidePanel(scene, {
        title: 'Settings',
        titleColor: '#76d7c4',
        closeLabel: 'Close Settings'
    });
    const { container: settingsPanel, panelWidth, sectionWidth } = panel;

    const contentTop = 90;
    const contentHeight = 260;
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
        padding: { x: 18, y: 10 },
        forceNormalText: true
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

    const skipButtonY = testingButtonY + toggleSpacing;
    scene.mapSkipButton = scene.add.text(panelWidth / 2, skipButtonY, 'Skip Map ▶', {
        fontSize: '22px',
        color: '#ecf0f1',
        padding: { x: 18, y: 10 }
    }).setOrigin(0.5);
    applyTextButtonStyle(scene.mapSkipButton, {
        baseColor: '#34495e',
        textColor: '#ecf0f1',
        hoverBlend: 0.2,
        pressBlend: 0.3,
        disabledBlend: 0.45
    });
    setTextButtonEnabled(scene.mapSkipButton, false);
    scene.mapSkipButton.setVisible(false);
    scene.mapSkipButton.on('pointerdown', () => scene.handleMapSkipButtonPress());
    settingsPanel.add(scene.mapSkipButton);

    scene.settingsCloseButton = panel.closeButton;
    scene.settingsCloseButton.on('pointerup', () => scene.closeSettings());

    settingsPanel.setVisible(false);
    scene.settingsPanel = settingsPanel;
    scene.isSettingsOpen = false;
    scene.updateSettingsButtonLabel();
    scene.updateMuteButtonState();
    scene.updateTestingModeButtonState();
    scene.updateMapSkipButtonState();
}
