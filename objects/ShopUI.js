import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';
import { CONSTANTS } from '../config.js';
import { createBitmapText } from '../utils/BitmapTextFactory.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 540;
const CARD_WIDTH = 250;
const CARD_HEIGHT = 260;
const CARD_GAP = 24;

export class ShopUI {
    constructor(scene, { relics = [], onPurchase, onClose, capacity = {} } = {}) {
        this.scene = scene;
        this.relics = relics;
        this.onPurchase = typeof onPurchase === 'function' ? onPurchase : () => false;
        this.onClose = typeof onClose === 'function' ? onClose : () => {};
        this.cardContainers = [];
        this.isDestroyed = false;
        this.relicCapacity = {
            current: typeof capacity.currentCount === 'number' ? capacity.currentCount : 0,
            max: typeof capacity.maxCount === 'number' ? capacity.maxCount : 0
        };
        this.capacityText = null;

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
            title: 'Relic Shop',
            titleStyle: {
                fontSize: '40px',
                color: '#f1c40f',
                fontStyle: 'bold'
            },
            subtitle: 'Relics provide permanent bonuses.',
            subtitleStyle: {
                fontSize: '22px',
                color: '#f9e79f'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.renderRelicCards();
        this.createCapacityMessage();
        this.createLeaveButton();
    }

    renderRelicCards() {
        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        const cardSpacing = CARD_WIDTH + CARD_GAP;
        const startX = this.relics.length > 1
            ? -((this.relics.length - 1) * cardSpacing) / 2
            : 0;
        const cardY = 2;
        const capacityFull = this.isRelicCapacityFull();

        this.relics.forEach((relic, index) => {
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

            const icon = createBitmapText(this.scene, 0, -CARD_HEIGHT / 2 + 50, relic.icon || '♦', {
                fontSize: '52px',
                padding: CONSTANTS.EMOJI_TEXT_PADDING
            }).setOrigin(0.5);

            const nameText = createBitmapText(this.scene, 0, icon.y + 46, relic.name, {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const descText = createBitmapText(this.scene, 0, nameText.y + 28, relic.description, {
                fontSize: '16px',
                color: '#f8f9f9',
                wordWrap: { width: CARD_WIDTH - 48 }
            }).setOrigin(0.5, 0);

            const buttonY = CARD_HEIGHT / 2 - 50;
            const buttonBg = this.scene.add.rectangle(0, buttonY, CARD_WIDTH - 48, 48, 0x271438, 0.92)
                .setStrokeStyle(2, 0xf1c40f, 0.85);

            const buttonText = createBitmapText(this.scene, 0, buttonY, '', {
                fontSize: '18px',
                color: '#f9e79f'
            }).setOrigin(0.5);

            const isOwned = relic.owned;

            const disableButton = (label, alpha = 0.6) => {
                buttonText.setText(label);
                buttonBg.setFillStyle(0x2c173a, alpha);
                buttonText.setAlpha(alpha);
                buttonBg.disableInteractive();
            };

            if (isOwned) {
                disableButton('Owned');
                cardBg.setAlpha(0.9);
                icon.setAlpha(0.9);
                nameText.setAlpha(0.9);
                descText.setAlpha(0.9);
            } else if (capacityFull) {
                disableButton(`Buy (${relic.cost}g)`);
            } else if (!relic.canAfford) {
                buttonText.setText('Not enough gold');
                buttonBg.setFillStyle(0x2c173a, 0.6);
                buttonText.setAlpha(0.6);
                cardBg.setAlpha(0.85);
                icon.setAlpha(0.85);
                nameText.setAlpha(0.85);
                descText.setAlpha(0.85);
                buttonBg.disableInteractive();
            } else {
                buttonBg.setInteractive({ useHandCursor: true });
                buttonText.setText(`Buy (${relic.cost}g)`);
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
                    const purchased = this.onPurchase(relic.id);
                    if (purchased) {
                        this.scene.sound.play('chimeShort', { volume: 0.6 });
                    }
                });
            }

            if (!capacityFull && relic.canAfford && !isOwned) {
                buttonText.setAlpha(1);
            }

            cardContainer.add([cardBg, icon, nameText, descText, buttonBg, buttonText]);
            this.container.add(cardContainer);
            this.cardContainers.push(cardContainer);
        });

        this.updateCapacityMessage();
    }

    updateRelics(relics, capacity = {}) {
        this.relics = relics;
        this.setRelicCapacity(capacity);
        this.renderRelicCards();
    }

    setRelicCapacity(capacity = {}) {
        if (typeof capacity.currentCount === 'number') {
            this.relicCapacity.current = capacity.currentCount;
        }
        if (typeof capacity.maxCount === 'number') {
            this.relicCapacity.max = capacity.maxCount;
        }
    }

    isRelicCapacityFull() {
        const { current, max } = this.relicCapacity;
        return typeof max === 'number' && max > 0 && typeof current === 'number' && current >= max;
    }

    createCapacityMessage() {
        const messageY = PANEL_HEIGHT / 2 - 90;
        const text = createBitmapText(this.scene, 0, messageY, 'Sell a relic from your pack to make space.', {
            fontSize: '18px',
            color: '#f9e79f'
        }).setOrigin(0.5);
        text.setVisible(this.isRelicCapacityFull() && this.hasUnpurchasedRelics());
        this.container.add(text);
        this.capacityText = text;
    }

    updateCapacityMessage() {
        if (!this.capacityText) {
            return;
        }

        this.capacityText.setVisible(this.isRelicCapacityFull() && this.hasUnpurchasedRelics());
    }

    hasUnpurchasedRelics() {
        if (!Array.isArray(this.relics)) {
            return false;
        }

        return this.relics.some(relic => relic && !relic.owned);
    }

    createLeaveButton() {
        const leaveY = PANEL_HEIGHT / 2 - 40;
        const leaveBg = this.scene.add.rectangle(0, leaveY, PANEL_WIDTH - 160, 58, 0x2d1b3d, 0.92)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });

        const leaveText = createBitmapText(this.scene, 0, leaveY, 'Leave Shop', {
            fontSize: '24px',
            color: '#f9e79f'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(leaveBg, {
            baseColor: 0x2d1b3d,
            baseAlpha: 0.92,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });
        leaveBg.on('pointerup', () => this.onClose());

        this.container.add([leaveBg, leaveText]);
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;

        destroyModal(this.modal);
        this.modal = null;

        this.cardContainers = [];

        if (this.capacityText) {
            this.capacityText.destroy();
            this.capacityText = null;
        }
    }
}
