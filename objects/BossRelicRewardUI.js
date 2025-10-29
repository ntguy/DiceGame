import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 480;
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
        this.modal = null;
        this.backdrop = null;
        this.container = null;

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
            title: 'Boss Reward',
            titleStyle: {
                fontSize: '40px',
                color: '#f1c40f',
                fontStyle: 'bold'
            },
            subtitle: 'Choose one reward.',
            subtitleStyle: {
                fontSize: '22px',
                color: '#f9e79f'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.renderOptions();
    }

    renderOptions() {
        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        if (!Array.isArray(this.options) || this.options.length === 0) {
            return;
        }

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

            const nameText = this.scene.add.text(0, icon.y + 46, option.name || 'Reward', {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const descriptionText = this.scene.add.text(0, nameText.y + 28, option.description || '', {
                fontSize: '16px',
                color: '#f8f9f9',
                wordWrap: { width: CARD_WIDTH - 48 }
            }).setOrigin(0.5, 0);

            const buttonY = CARD_HEIGHT / 2 - 50;
            const buttonBg = this.scene.add.rectangle(0, buttonY, CARD_WIDTH - 48, 48, 0x271438, 0.92)
                .setStrokeStyle(2, 0xf1c40f, 0.85);

            const buttonText = this.scene.add.text(0, buttonY, option.buttonLabel || 'Claim', {
                fontSize: '18px',
                color: '#f9e79f'
            }).setOrigin(0.5);

            if (option.disabled) {
                buttonBg.setFillStyle(0x2c173a, 0.6);
                buttonBg.disableInteractive();
                buttonText.setAlpha(0.6);
            } else {
                buttonBg.setInteractive({ useHandCursor: true });
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
                    if (!buttonBg.input || !buttonBg.input.enabled) {
                        return;
                    }

                    const shouldClose = this.onSelect(option);
                    if (shouldClose) {
                        if (this.scene.sound && typeof this.scene.sound.play === 'function') {
                            this.scene.sound.play('chimeShort', { volume: 0.6 });
                        }
                        this.destroy();
                        this.onClose();
                    }
                });
            }

            cardContainer.add([cardBg, icon, nameText, descriptionText, buttonBg, buttonText]);
            this.container.add(cardContainer);
            this.cardContainers.push(cardContainer);
        });
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;

        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        destroyModal(this.modal);
        this.modal = null;
        this.backdrop = null;
        this.container = null;
    }
}
