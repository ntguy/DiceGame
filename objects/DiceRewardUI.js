import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 480;
const CARD_WIDTH = 250;
const CARD_HEIGHT = 260;
const CARD_GAP = 24;
const EMOJI_TEXT_PADDING = { top: 6, bottom: 6 };

export class DiceRewardUI {
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
            title: 'Choose a Die',
            titleStyle: {
                fontSize: '40px',
                color: '#f1c40f',
                fontStyle: 'bold'
            },
            subtitle: 'Select one die to add to your collection.',
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

            const icon = this.scene.add.text(0, -CARD_HEIGHT / 2 + 50, option.emoji || '🎲', {
                fontSize: '52px',
                padding: EMOJI_TEXT_PADDING
            }).setOrigin(0.5);

            const nameText = this.scene.add.text(0, icon.y + 46, option.name || 'Die', {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const descriptionText = this.scene.add.text(0, nameText.y + 28, option.description || '', {
                fontSize: '16px',
                color: '#f8f9f9',
                wordWrap: { width: CARD_WIDTH - 48 }
            }).setOrigin(0.5, 0);

            const upgradeLabel = option.upgradeDescription ? option.upgradeDescription : '';
            const upgradeText = this.scene.add.text(0, descriptionText.y + 86, upgradeLabel, {
                fontSize: '15px',
                color: '#c39bd3',
                wordWrap: { width: CARD_WIDTH - 48 }
            }).setOrigin(0.5, 0);

            const buttonY = CARD_HEIGHT / 2 - 50;
            const buttonBg = this.scene.add.rectangle(0, buttonY, CARD_WIDTH - 48, 48, 0x271438, 0.92)
                .setStrokeStyle(2, 0xf1c40f, 0.85)
                .setInteractive({ useHandCursor: true });

            const buttonText = this.scene.add.text(0, buttonY, 'Choose', {
                fontSize: '18px',
                color: '#f9e79f'
            }).setOrigin(0.5);

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
                const selected = this.onSelect(option.id, option);
                if (selected) {
                    this.scene.sound.play('chimeShort', { volume: 0.6 });
                    this.destroy();
                    this.onClose();
                }
            });

            cardContainer.add([cardBg, icon, nameText, descriptionText, upgradeText, buttonBg, buttonText]);
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
    }
}
