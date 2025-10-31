import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';
import { CONSTANTS } from '../config.js';
import { createBitmapText } from '../utils/BitmapTextLabel.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 560;
const CARD_WIDTH = 250;
const CARD_HEIGHT = 280;
const CARD_GAP = 24;
const CAPACITY_TEXT_Y = PANEL_HEIGHT / 2 - 110;
const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 52;

export class BossRelicRewardUI {
    constructor(scene, {
        choices = [],
        onSelect,
        onClose,
        capacity = {}
    } = {}) {
        this.scene = scene;
        this.choices = Array.isArray(choices) ? choices : [];
        this.onSelect = typeof onSelect === 'function' ? onSelect : () => false;
        this.onClose = typeof onClose === 'function' ? onClose : () => {};
        this.capacity = {
            current: typeof capacity.currentCount === 'number' ? capacity.currentCount : 0,
            max: typeof capacity.maxCount === 'number' ? capacity.maxCount : 0
        };
        this.cardContainers = [];
        this.isDestroyed = false;
        this.capacityText = null;
        this.continueButton = null;

        if (this.scene && typeof this.scene.acquireModalInputLock === 'function') {
            this.scene.acquireModalInputLock();
        }

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
                fontSize: '42px',
                color: '#f1c40f',
                fontStyle: 'bold'
            },
            subtitle: 'Choose one reward to aid your journey.',
            subtitleStyle: {
                fontSize: '22px',
                color: '#f9e79f'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.renderChoices();
        this.createCapacityText();
        this.createContinueButton();
    }

    renderChoices() {
        if (this.isDestroyed || !this.container) {
            return;
        }

        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        const count = this.choices.length;
        if (count === 0) {
            return;
        }

        const cardSpacing = CARD_WIDTH + CARD_GAP;
        const startX = count > 1 ? -((count - 1) * cardSpacing) / 2 : 0;
        const cardY = -20;
        const capacityFull = this.isCapacityFull();

        this.choices.forEach((choice, index) => {
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

            const icon = createBitmapText(this.scene, 0, -CARD_HEIGHT / 2 + 50, choice.icon || '♦', {
                fontSize: '52px',
                padding: CONSTANTS.EMOJI_TEXT_PADDING
            }).setOrigin(0.5);

            const nameText = createBitmapText(this.scene, 0, icon.y + 46, choice.name || 'Reward', {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const descText = createBitmapText(this.scene, 0, nameText.y + 28, choice.description || '', {
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

            const canSelect = this.canSelectChoice(choice, { capacityFull });
            const buttonLabel = this.getButtonLabel(choice, { capacityFull });
            buttonText.setText(buttonLabel);

            if (canSelect) {
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
                    if (this.isDestroyed) {
                        return;
                    }
                    const accepted = this.onSelect(choice);
                    if (accepted) {
                        if (this.scene && this.scene.sound && typeof this.scene.sound.play === 'function') {
                            this.scene.sound.play('chimeShort', { volume: 0.65 });
                        }
                        this.destroy();
                    }
                });
            } else {
                buttonBg.setFillStyle(0x2c173a, 0.6);
                buttonText.setAlpha(0.6);
                buttonBg.disableInteractive();
            }

            cardContainer.add([cardBg, icon, nameText, descText, buttonBg, buttonText]);
            this.container.add(cardContainer);
            this.cardContainers.push(cardContainer);
        });
    }

    canSelectChoice(choice, { capacityFull = false } = {}) {
        if (!choice) {
            return false;
        }

        if (choice.type === 'relic') {
            if (choice.disabled) {
                return false;
            }
            return !capacityFull;
        }

        if (choice.type === 'bonus') {
            return !choice.disabled;
        }

        return !choice.disabled;
    }

    getButtonLabel(choice, { capacityFull = false } = {}) {
        if (!choice) {
            return 'Unavailable';
        }

        if (choice.type === 'relic') {
            if (choice.disabled || capacityFull) {
                return 'Relic Slots Full';
            }
            return 'Claim Relic';
        }

        if (choice.type === 'bonus') {
            return choice.disabled ? 'Unavailable' : 'Claim Reward';
        }

        return choice.disabled ? 'Unavailable' : 'Select';
    }

    isCapacityFull() {
        const { current, max } = this.capacity;
        return typeof max === 'number' && max > 0 && typeof current === 'number' && current >= max;
    }

    createCapacityText() {
        const text = createBitmapText(this.scene, 0, CAPACITY_TEXT_Y, '', {
            fontSize: '18px',
            color: '#f9e79f',
            align: 'center'
        }).setOrigin(0.5);

        this.capacityText = text;
        this.container.add(text);
        this.updateCapacityText();
    }

    getCapacityLabel() {
        const { current, max } = this.capacity;
        if (typeof max === 'number' && max > 0) {
            const label = `Relic Slots: ${Math.min(current, max)} / ${max}`;
            if (this.isCapacityFull()) {
                return `${label}\nSell a relic from your pack to make space.`;
            }
            return label;
        }
        return 'Relic Slots: --';
    }

    updateCapacityText() {
        if (this.capacityText) {
            this.capacityText.setText(this.getCapacityLabel());
        }
    }

    updateCapacity(capacity = {}) {
        if (this.isDestroyed) {
            return;
        }

        if (capacity && typeof capacity === 'object') {
            if (typeof capacity.currentCount === 'number') {
                this.capacity.current = capacity.currentCount;
            }
            if (typeof capacity.maxCount === 'number') {
                this.capacity.max = capacity.maxCount;
            }
        }

        this.updateCapacityText();
        this.renderChoices();
    }

    createContinueButton() {
        const buttonY = PANEL_HEIGHT / 2 - 50;
        const buttonBg = this.scene.add.rectangle(0, buttonY, BUTTON_WIDTH, BUTTON_HEIGHT, 0x271438, 0.92)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });

        const buttonText = createBitmapText(this.scene, 0, buttonY, 'Continue', {
            fontSize: '20px',
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
            if (this.isDestroyed) {
                return;
            }
            this.onClose();
            this.destroy();
        });

        this.continueButton = { background: buttonBg, label: buttonText };
        this.container.add(buttonBg);
        this.container.add(buttonText);
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;

        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        if (this.continueButton) {
            const { background, label } = this.continueButton;
            if (background) {
                background.destroy();
            }
            if (label) {
                label.destroy();
            }
            this.continueButton = null;
        }

        if (this.capacityText) {
            this.capacityText.destroy();
            this.capacityText = null;
        }

        destroyModal(this.modal);
        this.modal = null;
        this.backdrop = null;
        this.container = null;

        if (this.scene && typeof this.scene.releaseModalInputLock === 'function') {
            this.scene.releaseModalInputLock();
        }
    }
}
