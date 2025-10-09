import { CONSTANTS } from '../config.js';
import { COMBO_POINTS } from '../systems/ComboSystem.js';
import { applyRectangleButtonStyle, applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

const MENU_BUTTON_STYLE = {
    baseColor: '#34495e',
    textColor: '#ecf0f1',
    hoverBlend: 0.14,
    pressBlend: 0.25,
    disabledBlend: 0.45,
    enabledAlpha: 1,
    disabledAlpha: 0.45
};

const SECTION_BORDER_COLOR = 0xf1c40f;

export class MenuPanel {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.menuButton = null;
        this.panelContainer = null;
        this.closeButtonBg = null;
        this.muteButtonText = null;

        this.createMenuButton();
        this.createPanel();
    }

    createMenuButton() {
        const x = CONSTANTS.UI_MARGIN;
        const y = this.scene.scale.height - CONSTANTS.UI_MARGIN;
        const button = this.scene.add.text(x, y, 'MENU', {
            fontSize: '32px',
            color: '#ecf0f1',
            padding: { x: 18, y: 10 }
        }).setOrigin(0, 1).setDepth(50);

        applyTextButtonStyle(button, MENU_BUTTON_STYLE);
        setTextButtonEnabled(button, true);
        button.on('pointerup', () => {
            this.toggle();
        });

        this.menuButton = button;
    }

    createPanel() {
        const panelWidth = Math.max(260, Math.floor(this.scene.scale.width * 0.25));
        const panelHeight = this.scene.scale.height;
        const panelX = this.scene.scale.width - panelWidth / 2;
        const panelY = panelHeight / 2;

        const container = this.scene.add.container(panelX, panelY).setDepth(45);
        const background = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x0d1018, 0.96)
            .setOrigin(0.5)
            .setStrokeStyle(2, SECTION_BORDER_COLOR, 0.22)
            .setInteractive();

        container.add(background);

        const contentWidth = panelWidth - 48;
        const topOffset = -panelHeight / 2 + 48;

        const combosBottom = this.createCombosSection(container, contentWidth, topOffset);
        this.createSettingsSection(container, contentWidth, combosBottom + 24);
        this.createCloseButton(container, panelWidth, panelHeight);

        container.setVisible(false);
        container.setActive(false);

        this.panelContainer = container;
    }

    createCombosSection(container, contentWidth, top) {
        const combos = Object.entries(COMBO_POINTS);
        const combosHeight = combos.length * 28 + 80;
        const section = this.scene.add.container(0, top + combosHeight / 2);

        const sectionBg = this.scene.add.rectangle(0, 0, contentWidth, combosHeight, 0x1a2235, 0.94)
            .setOrigin(0.5)
            .setStrokeStyle(2, SECTION_BORDER_COLOR, 0.28);
        section.add(sectionBg);

        const title = this.scene.add.text(-contentWidth / 2 + 18, -combosHeight / 2 + 18, 'Combo Bonuses', {
            fontSize: '24px',
            color: '#f9e79f',
            fontStyle: 'bold'
        }).setOrigin(0, 0);
        section.add(title);

        combos.forEach(([combo, points], index) => {
            const lineY = -combosHeight / 2 + 60 + index * 26;
            const comboText = this.scene.add.text(-contentWidth / 2 + 20, lineY, `${combo}: +${points}`, {
                fontSize: '18px',
                color: '#ecf0f1'
            }).setOrigin(0, 0);
            section.add(comboText);
        });

        container.add(section);
        return top + combosHeight;
    }

    createSettingsSection(container, contentWidth, top) {
        const settingsHeight = 170;
        const section = this.scene.add.container(0, top + settingsHeight / 2);

        const sectionBg = this.scene.add.rectangle(0, 0, contentWidth, settingsHeight, 0x141c2b, 0.94)
            .setOrigin(0.5)
            .setStrokeStyle(2, SECTION_BORDER_COLOR, 0.24);
        section.add(sectionBg);

        const title = this.scene.add.text(-contentWidth / 2 + 18, -settingsHeight / 2 + 18, 'Settings', {
            fontSize: '24px',
            color: '#f9e79f',
            fontStyle: 'bold'
        }).setOrigin(0, 0);
        section.add(title);

        const buttonWidth = contentWidth - 40;
        const buttonY = -settingsHeight / 2 + 88;
        const muteBg = this.scene.add.rectangle(0, buttonY, buttonWidth, 50, 0x2d1b3d, 0.95)
            .setStrokeStyle(2, SECTION_BORDER_COLOR, 0.6)
            .setInteractive({ useHandCursor: true });
        applyRectangleButtonStyle(muteBg, {
            baseColor: 0x2d1b3d,
            baseAlpha: 0.95,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });

        muteBg.on('pointerup', () => {
            if (this.scene && typeof this.scene.toggleMute === 'function') {
                this.scene.toggleMute();
            }
        });

        const muteText = this.scene.add.text(0, buttonY, '', {
            fontSize: '20px',
            color: '#f9e79f'
        }).setOrigin(0.5);

        section.add(muteBg);
        section.add(muteText);

        this.muteButtonText = muteText;
        container.add(section);
    }

    createCloseButton(container, panelWidth, panelHeight) {
        const buttonWidth = panelWidth - 80;
        const buttonY = panelHeight / 2 - 70;
        const closeBg = this.scene.add.rectangle(0, buttonY, buttonWidth, 56, 0x2d1b3d, 0.95)
            .setStrokeStyle(2, SECTION_BORDER_COLOR, 0.68)
            .setInteractive({ useHandCursor: true });

        applyRectangleButtonStyle(closeBg, {
            baseColor: 0x2d1b3d,
            baseAlpha: 0.95,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });

        closeBg.on('pointerup', () => this.toggle(false));

        const closeText = this.scene.add.text(0, buttonY, 'Close Menu', {
            fontSize: '22px',
            color: '#f9e79f'
        }).setOrigin(0.5);

        container.add(closeBg);
        container.add(closeText);

        this.closeButtonBg = closeBg;
    }

    toggle(forceState) {
        const targetState = typeof forceState === 'boolean' ? forceState : !this.isOpen;
        if (targetState === this.isOpen) {
            return;
        }

        this.isOpen = targetState;

        if (this.panelContainer) {
            this.panelContainer.setVisible(this.isOpen);
            this.panelContainer.setActive(this.isOpen);
        }
    }

    setVisible(visible) {
        if (this.menuButton) {
            this.menuButton.setVisible(visible);
            setTextButtonEnabled(this.menuButton, visible);
        }

        if (!visible) {
            this.toggle(false);
        }
    }

    updateMuteLabel(isMuted) {
        if (this.muteButtonText) {
            const state = isMuted ? 'On' : 'Off';
            this.muteButtonText.setText(`Mute: ${state}`);
        }
    }
}
