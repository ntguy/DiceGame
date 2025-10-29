import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 520;
const CARD_WIDTH = 250;
const CARD_HEIGHT = 260;
const CARD_GAP = 24;

export class BossRelicRewardUI {
    constructor(scene, { options = [], onSelect, onClose } = {}) {
        this.scene = scene;
        this.options = Array.isArray(options) ? options : [];
        this.onSelect = typeof onSelect === 'function' ? onSelect : () => false;
        this.onClose = typeof onClose === 'function' ? onClose : () => {};
        this.cardContainers = [];
        this.isDestroyed = false;

        this.create();
    }

    create() {
        const modal = createModal(this.scene, {
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
            panelColor: 0x1a1326,
            panelAlpha: 0.95,
            strokeColor: 0xf1c40f,
            strokeAlpha: 0.9,
            title: 'Choose a Relic',
            titleStyle: {
                fontSize: '40px',
                color: '#f1c40f',
                fontStyle: 'bold'
            },
            subtitle: 'Select one reward for defeating the boss.',
            subtitleStyle: {
                fontSize: '22px',
                color: '#f9e79f'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.renderOptions();
        this.createCloseButton();
    }

    renderOptions() {
        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        const cardSpacing = CARD_WIDTH + CARD_GAP;
        const startX = this.options.length > 1
            ? -((this.options.length - 1) * cardSpacing) / 2
            : 0;
        const cardY = 6;

        this.options.forEach((option, index) => {
            const cardX = startX + index * cardSpacing;
            const { container: cardContainer, background: cardBg } = createCard(this.scene, {
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                backgroundColor: 0x120a1a,
                backgroundAlpha: 0.95,
                strokeColor: 0xf1c40f,
                strokeAlpha: 0.9
            });

            cardContainer.setPosition(cardX, cardY);

            const icon = this.scene.add.text(0, -CARD_HEIGHT / 2 + 50, option.icon || '♦', {
                fontSize: '52px'
            }).setOrigin(0.5);

            const nameText = this.scene.add.text(0, icon.y + 46, option.name || 'Relic', {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const descText = this.scene.add.text(0, nameText.y + 28, option.description || '', {
                fontSize: '16px',
                color: '#f8f9f9',
                wordWrap: { width: CARD_WIDTH - 48 }
            }).setOrigin(0.5, 0);

            const buttonY = CARD_HEIGHT / 2 - 50;
            const buttonBg = this.scene.add.rectangle(0, buttonY, CARD_WIDTH - 48, 48, 0x271438, 0.92)
                .setStrokeStyle(2, 0xf1c40f, 0.85);

            const buttonText = this.scene.add.text(0, buttonY, '', {
                fontSize: '18px',
                color: '#f9e79f'
            }).setOrigin(0.5);

            const disabled = !!option.disabled;
            if (disabled) {
                buttonText.setText(option.disabledLabel || 'Unavailable');
                buttonBg.setFillStyle(0x2c173a, 0.6);
                buttonText.setAlpha(0.6);
                cardBg.setAlpha(0.85);
                icon.setAlpha(0.85);
                nameText.setAlpha(0.85);
                descText.setAlpha(0.85);
            } else {
                buttonBg.setInteractive({ useHandCursor: true });
                buttonText.setText(option.buttonLabel || 'Claim');
                applyRectangleButtonStyle(buttonBg, {
                    baseColor: 0x271438,
                    baseAlpha: 0.92,
                    hoverBlend: 0.18,
                    pressBlend: 0.32,
                    disabledBlend: 0.5,
                    enabledAlpha: 1,
                    disabledAlpha: 0.45
                });
                buttonBg.on('pointerup', () => {
                    const result = this.onSelect(option);
                    if (result) {
                        this.scene.sound.play('chimeShort', { volume: 0.6 });
                        this.destroy();
                        this.onClose();
                    }
                });
            }

            cardContainer.add([cardBg, icon, nameText, descText, buttonBg, buttonText]);
            this.container.add(cardContainer);
            this.cardContainers.push(cardContainer);
        });
    }

    createCloseButton() {
        const buttonY = PANEL_HEIGHT / 2 - 50;
        const buttonBg = this.scene.add.rectangle(0, buttonY, PANEL_WIDTH - 160, 56, 0x2d1b3d, 0.92)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });

        const buttonText = this.scene.add.text(0, buttonY, 'Continue', {
            fontSize: '24px',
            color: '#f9e79f'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(buttonBg, {
            baseColor: 0x2d1b3d,
            baseAlpha: 0.92,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });

        buttonBg.on('pointerup', () => {
            this.destroy();
            this.onClose();
        });

        this.container.add(buttonBg);
        this.container.add(buttonText);
        this.skipButton = { background: buttonBg, text: buttonText };
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        destroyModal(this.modal);
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.cardContainers = [];
        this.skipButton = null;
        this.isDestroyed = true;
    }
}
