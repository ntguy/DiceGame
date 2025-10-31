import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle, setRectangleButtonEnabled } from './ui/ButtonStyles.js';
import { getBitmapTint } from '../utils/bitmapTextFactory.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 480;
const CARD_WIDTH = 250;
const CARD_HEIGHT = 260;
const CARD_GAP = 24;
const EMOJI_TEXT_PADDING = { top: 6, bottom: 6 };
const TOGGLE_MARGIN = 28;
const TOGGLE_WIDTH = 210;
const TOGGLE_HEIGHT = 48;
const TOGGLE_BOX_SIZE = 26;

export class DiceRewardUI {
    constructor(scene, {
        options = [],
        onSelect,
        onClose,
        onSkip,
        currentCount,
        maxCount
    } = {}) {
        this.scene = scene;
        this.options = Array.isArray(options) ? options : [];
        this.onSelect = typeof onSelect === 'function' ? onSelect : () => false;
        this.onClose = typeof onClose === 'function' ? onClose : () => {};
        this.onSkip = typeof onSkip === 'function' ? onSkip : null;
        this.maxCount = typeof maxCount === 'number' ? maxCount : null;
        this.currentCount = typeof currentCount === 'number' ? currentCount : null;
        this.cardContainers = [];
        this.cardEntries = [];
        this.isDestroyed = false;
        this.viewUpgrade = false;
        this.selectionEnabledLabel = 'Choose';
        this.selectionDisabledLabel = 'Hand Full';
        this.selectionEnabled = true;
        this.isHandFull = false;
        this.capacityText = null;
        this.skipButton = null;

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

        this.createUpgradeToggle();
        this.renderOptions();
        this.createFooter();
        this.updateCapacityState({ currentCount: this.currentCount, maxCount: this.maxCount });
    }

    createUpgradeToggle() {
        const toggleContainer = this.scene.add.container(
            PANEL_WIDTH / 2 - TOGGLE_MARGIN - TOGGLE_WIDTH / 2,
            -PANEL_HEIGHT / 2 + TOGGLE_MARGIN + TOGGLE_HEIGHT / 2
        );

        const toggleBackground = this.scene.add.rectangle(0, 0, TOGGLE_WIDTH, TOGGLE_HEIGHT, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        const boxX = -TOGGLE_WIDTH / 2 + TOGGLE_BOX_SIZE / 2 + 12;
        const box = this.scene.add.rectangle(boxX, 0, TOGGLE_BOX_SIZE, TOGGLE_BOX_SIZE, 0x271438, 0.9)
            .setStrokeStyle(2, 0xf1c40f, 0.85);

        const checkmark = this.scene.add.text(boxX, 0, '✔', {
            fontSize: '20px',
            color: '#f1c40f'
        }).setOrigin(0.5);
        checkmark.setVisible(false);

        const label = this.scene.add.text(boxX + TOGGLE_BOX_SIZE / 2 + 16, 0, 'View Upgrade', {
            fontSize: '20px',
            color: '#f9e79f'
        }).setOrigin(0, 0.5);

        toggleBackground.on('pointerup', () => {
            if (this.scene.sound && typeof this.scene.sound.play === 'function') {
                switch (this.viewUpgrade){
                    case true:
                        this.scene.sound.play('tick', { volume: 0.5 });
                        break;
                    case false:
                        this.scene.sound.play('tock', { volume: 0.5 });
                        break;
                    default:
                        break;
                }
            }
            this.setViewUpgrade(!this.viewUpgrade);
        });

        toggleBackground.on('pointerover', () => {
            box.setFillStyle(0x2f1c44, 0.95);
        });

        toggleBackground.on('pointerout', () => {
            box.setFillStyle(0x271438, 0.9);
        });

        toggleContainer.add([toggleBackground, box, checkmark, label]);
        this.container.add(toggleContainer);

        this.toggle = {
            container: toggleContainer,
            background: toggleBackground,
            box,
            checkmark,
            label
        };
    }

    setViewUpgrade(value) {
        this.viewUpgrade = !!value;
        if (this.toggle && this.toggle.checkmark) {
            this.toggle.checkmark.setVisible(this.viewUpgrade);
        }

        this.updateCardViews();
    }

    renderOptions() {
        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];
        this.cardEntries = [];

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

            const icon = this.scene.add.text(0, -CARD_HEIGHT / 2 + 50, option.emoji || '', {
                fontSize: '52px',
                padding: EMOJI_TEXT_PADDING,
                forceNormalText: true
            }).setOrigin(0.5);

            const nameText = this.scene.add.text(0, icon.y + 46, option.name || 'Unknown', {
                fontSize: '32px',
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
                .setStrokeStyle(2, 0xf1c40f, 0.85)
                .setInteractive({ useHandCursor: true });

            const buttonText = this.scene.add.text(0, buttonY, this.selectionEnabledLabel, {
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
                if (!buttonBg.input || !buttonBg.input.enabled) {
                    return;
                }
                const selected = this.onSelect(option.id, option);
                if (selected) {
                    this.scene.sound.play('chimeShort', { volume: 0.6 });
                    this.destroy();
                    this.onClose();
                }
            });

            cardContainer.add([cardBg, icon, nameText, descriptionText, buttonBg, buttonText]);
            this.container.add(cardContainer);
            this.cardContainers.push(cardContainer);

            const entry = {
                option,
                container: cardContainer,
                icon,
                nameText,
                descriptionText,
                button: { background: buttonBg, text: buttonText }
            };

            this.cardEntries.push(entry);
            this.updateCardEntry(entry);
        });

        this.updateCardViews();
    }

    updateCardViews() {
        this.cardEntries.forEach(entry => this.updateCardEntry(entry));
    }

    updateCardEntry(entry) {
        if (!entry) {
            return;
        }

        const { option, nameText, descriptionText, button } = entry;
        const isUpgrade = this.viewUpgrade;

        const baseName = option.name || 'Unknown';
        const displayName = isUpgrade ? ` ${baseName}+` : ` ${baseName} `;
        const nameColor = isUpgrade ? '#f1c40f' : '#ffffff';

        nameText.setText(displayName);
        nameText.setTint(getBitmapTint(nameColor));

        const description = isUpgrade
            ? option.upgradeDescription || option.description || ''
            : option.description || '';

        descriptionText.setText(description);

        if (button && button.background) {
            const selectionEnabled = !isUpgrade && this.selectionEnabled;
            const showHandFullLabel = !selectionEnabled && !isUpgrade && this.isHandFull;
            const label = selectionEnabled
                ? this.selectionEnabledLabel
                : (showHandFullLabel ? this.selectionDisabledLabel : this.selectionEnabledLabel);

            setRectangleButtonEnabled(button.background, selectionEnabled);
            if (button.text) {
                button.text.setAlpha(selectionEnabled ? 1 : 0.45);
                button.text.setText(label);
            }
        }
    }

    createFooter() {
        const messageY = PANEL_HEIGHT / 2 - 60;
        const skipX = PANEL_WIDTH / 2 - 140;

        const capacityText = this.scene.add.text(-PANEL_WIDTH / 2 + 40, messageY, 'Discard a die from your pack (🎒) to make space.', {
            fontSize: '18px',
            color: '#f9e79f'
        }).setOrigin(0, 0.5);
        capacityText.setVisible(false);

        const skipButtonBg = this.scene.add.rectangle(skipX, messageY, 180, 48, 0x2d1b3d, 0.92)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });

        const skipButtonText = this.scene.add.text(skipX, messageY, 'Skip', {
            fontSize: '18px',
            color: '#f9e79f'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(skipButtonBg, {
            baseColor: 0x2d1b3d,
            baseAlpha: 0.92,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });

        skipButtonBg.on('pointerup', () => {
            if (this.scene.sound && typeof this.scene.sound.play === 'function') {
                this.scene.sound.play('tick', { volume: 0.5 });
            }

            const shouldClose = this.onSkip ? this.onSkip() : true;
            if (shouldClose !== false) {
                this.destroy();
                this.onClose();
            }
        });

        this.container.add([capacityText, skipButtonBg, skipButtonText]);
        this.capacityText = capacityText;
        this.skipButton = { background: skipButtonBg, text: skipButtonText };
    }

    updateCapacityState({ currentCount, maxCount } = {}) {
        if (typeof currentCount === 'number') {
            this.currentCount = currentCount;
        }
        if (typeof maxCount === 'number') {
            this.maxCount = maxCount;
        }

        const hasCapacityInfo = typeof this.currentCount === 'number' && typeof this.maxCount === 'number';
        this.isHandFull = hasCapacityInfo ? this.currentCount >= this.maxCount : false;
        this.selectionEnabled = !this.isHandFull;

        if (this.capacityText) {
            this.capacityText.setVisible(this.isHandFull);
        }

        this.updateCardViews();
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;

        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];
        this.cardEntries = [];

        if (this.toggle && this.toggle.container) {
            this.toggle.container.destroy(true);
            this.toggle = null;
        }

        if (this.capacityText) {
            this.capacityText.destroy();
            this.capacityText = null;
        }

        if (this.skipButton) {
            if (this.skipButton.background) {
                this.skipButton.background.destroy();
            }
            if (this.skipButton.text) {
                this.skipButton.text.destroy();
            }
            this.skipButton = null;
        }

        destroyModal(this.modal);
        this.modal = null;
    }
}
