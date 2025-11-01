import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';
import { createSidePanel } from './ui/SidePanelFactory.js';

function createVolumeSlider(scene, settingsPanel, {
    x,
    y,
    width,
    initialValue = 1,
    onChange
}) {
    const clampFn = (typeof Phaser !== 'undefined'
        && Phaser.Math
        && typeof Phaser.Math.Clamp === 'function')
        ? Phaser.Math.Clamp
        : (value, min, max) => Math.min(max, Math.max(min, value));
    const clamp = value => clampFn(value, 0, 1);
    const sliderWidth = Math.max(0, Number.isFinite(width) ? width : 0);
    const track = scene.add.rectangle(x, y, sliderWidth, 6, 0xffffff, 0.22)
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
    const fill = scene.add.rectangle(x, y, sliderWidth, 6, 0x76d7c4, 0.85)
        .setOrigin(0, 0.5);
    const handle = scene.add.circle(x, y, 10, 0x76d7c4, 1)
        .setStrokeStyle(2, 0xffffff, 0.9)
        .setInteractive({ useHandCursor: true });

    settingsPanel.add([track, fill, handle]);

    const getPointerX = pointer => {
        if (pointer && typeof pointer.worldX === 'number') {
            return pointer.worldX;
        }
        if (pointer && typeof pointer.x === 'number') {
            return pointer.x;
        }
        return 0;
    };

    const updateVisuals = value => {
        const clamped = clamp(value);
        fill.displayWidth = sliderWidth * clamped;
        handle.x = x + sliderWidth * clamped;
    };

    const applyValue = (value, { emit = true } = {}) => {
        const clamped = clamp(value);
        updateVisuals(clamped);
        if (emit && typeof onChange === 'function') {
            onChange(clamped);
        }
    };

    const pointerToValue = pointer => {
        const pointerX = getPointerX(pointer);
        const matrix = track.getWorldTransformMatrix();
        const left = matrix ? matrix.tx : x;
        if (sliderWidth <= 0) {
            return 0;
        }
        const normalized = (pointerX - left) / sliderWidth;
        return clamp(normalized);
    };

    track.on('pointerdown', pointer => {
        applyValue(pointerToValue(pointer));
    });
    track.on('pointermove', pointer => {
        if (pointer && pointer.isDown) {
            applyValue(pointerToValue(pointer));
        }
    });

    handle.on('pointerdown', pointer => {
        applyValue(pointerToValue(pointer));
    });

    if (scene.input && typeof scene.input.setDraggable === 'function') {
        scene.input.setDraggable(handle);
        handle.on('drag', pointer => {
            applyValue(pointerToValue(pointer));
        });
    }

    handle.on('pointerover', () => handle.setScale(1.1));
    handle.on('pointerout', () => handle.setScale(1));

    applyValue(clamp(initialValue), { emit: false });

    return {
        track,
        fill,
        handle,
        setValue(value, options = {}) {
            applyValue(value, options);
        },
        getValue() {
            const currentWidth = sliderWidth > 0 ? fill.displayWidth / sliderWidth : 0;
            return clamp(currentWidth);
        }
    };
}

export function createSettingsUI(scene) {
    if (scene.settingsPanel) {
        scene.settingsPanel.destroy(true);
        scene.settingsPanel = null;
    }

    scene.mapSkipButton = null;
    scene.settingsBackground = null;
    scene.settingsBackgroundBaseHeight = null;
    scene.settingsBackgroundExpandedHeight = null;

    const panel = createSidePanel(scene, {
        title: 'Settings',
        titleColor: '#76d7c4',
        closeLabel: 'Close Settings'
    });
    const { container: settingsPanel, panelWidth, sectionWidth, padding } = panel;

    const contentTop = 90;
    const contentHeight = 260;
    const contentCenterY = contentTop + contentHeight / 2;

    const settingsBg = scene.add.rectangle(panelWidth / 2, contentCenterY, sectionWidth, contentHeight, 0x232d3b, 0.92)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0x76d7c4, 0.18);
    settingsPanel.add(settingsBg);

    const volumeRowY = contentTop + 52;
    const controlSpacing = 72;
    const musicRowY = volumeRowY + controlSpacing;
    const leftPadding = Number.isFinite(padding) ? padding : 24;
    const iconX = leftPadding + 34;
    const sliderStartX = leftPadding + 96;
    const sliderWidth = Math.max(120, sectionWidth - (sliderStartX - leftPadding) - 24);

    scene.sfxIcon = scene.add.text(iconX, volumeRowY, '🔊', {
        fontSize: '36px',
        color: '#ecf0f1'
    }).setOrigin(0.5);
    scene.sfxIcon.setInteractive({ useHandCursor: true });
    scene.sfxIcon.on('pointerdown', () => scene.toggleSfxMute());
    scene.sfxIcon.on('pointerover', () => scene.sfxIcon.setScale(1.1));
    scene.sfxIcon.on('pointerout', () => scene.sfxIcon.setScale(1));
    settingsPanel.add(scene.sfxIcon);

    scene.sfxSlider = createVolumeSlider(scene, settingsPanel, {
        x: sliderStartX,
        y: volumeRowY,
        width: sliderWidth,
        initialValue: scene.sfxVolume,
        onChange: value => scene.setSfxVolume(value)
    });

    scene.musicIcon = scene.add.text(iconX, musicRowY, '🎵', {
        fontSize: '36px',
        color: '#ecf0f1'
    }).setOrigin(0.5);
    scene.musicIcon.setInteractive({ useHandCursor: true });
    scene.musicIcon.on('pointerdown', () => scene.toggleMusicMute());
    scene.musicIcon.on('pointerover', () => scene.musicIcon.setScale(1.1));
    scene.musicIcon.on('pointerout', () => scene.musicIcon.setScale(1));
    settingsPanel.add(scene.musicIcon);

    scene.musicSlider = createVolumeSlider(scene, settingsPanel, {
        x: sliderStartX,
        y: musicRowY,
        width: sliderWidth,
        initialValue: scene.musicVolume,
        onChange: value => scene.setMusicVolume(value)
    });

    const testingButtonY = musicRowY + controlSpacing;
    scene.testingModeButton = scene.add.text(leftPadding + 10, testingButtonY, 'Testing Mode: OFF', {
        fontSize: '32px',
        color: '#ecf0f1',
        padding: { x: 18, y: 10 }
    }).setOrigin(0);
    applyTextButtonStyle(scene.testingModeButton, {
        baseColor: '#34495e',
        textColor: '#ecf0f1',
        hoverBlend: 0.2,
        pressBlend: 0.3,
        disabledBlend: 0.45,
        background: {
            paddingX: 72,
            paddingY: 28,
            baseColor: '#1f2a38',
            baseAlpha: 0.96,
            strokeColor: '#0d141f',
            strokeAlpha: 0.55,
            strokeWidth: 2
        }
    });
    setTextButtonEnabled(scene.testingModeButton, true);
    // scene.testingModeButton.setVisible(false);
    scene.testingModeButton.on('pointerdown', () => scene.toggleTestingMode());
    settingsPanel.add(scene.testingModeButton);

    // scene.time.delayedCall(10, () => {
    //     scene.testingModeButton.setVisible(true);
    //     setTextButtonEnabled(scene.testingModeButton, true);
    // });

    const skipButtonY = testingButtonY + controlSpacing;
    const expandedContentHeight = contentHeight + controlSpacing;
    scene.settingsBackground = settingsBg;
    scene.settingsBackgroundBaseHeight = contentHeight;
    scene.settingsBackgroundExpandedHeight = expandedContentHeight;

    scene.mapSkipButton = scene.add.text(panelWidth / 2, skipButtonY, 'Skip Map', {
        fontSize: '32px',
        color: '#ecf0f1',
        padding: { x: 18, y: 10 }
    }).setOrigin(0.5);
    applyTextButtonStyle(scene.mapSkipButton, {
        baseColor: '#34495e',
        textColor: '#ecf0f1',
        hoverBlend: 0.2,
        pressBlend: 0.3,
        disabledBlend: 0.45,
        background: {
            paddingX: 72,
            paddingY: 28,
            baseColor: '#1f2a38',
            baseAlpha: 0.96,
            strokeColor: '#0d141f',
            strokeAlpha: 0.55,
            strokeWidth: 2
        }
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
    scene.refreshVolumeUI();
    scene.updateTestingModeButtonState();
    scene.updateMapSkipButtonState();
}

