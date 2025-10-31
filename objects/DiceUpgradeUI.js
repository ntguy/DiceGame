import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle, setRectangleButtonEnabled } from './ui/ButtonStyles.js';
import { getBitmapTint } from '../utils/bitmapTextFactory.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 500;
const CARD_WIDTH = 250;
const CARD_HEIGHT = 280;
const CARD_GAP = 24;
const EMOJI_TEXT_PADDING = { top: 6, bottom: 6 };
const CHECKBOX_BOX_SIZE = 50;
const CHECKBOX_WIDTH = 210;
const CHECKBOX_HEIGHT = CHECKBOX_BOX_SIZE + 30;
const BUTTON_WIDTH = 260;
const BUTTON_HEIGHT = 58;
const BUTTON_OFFSET_Y = PANEL_HEIGHT / 2 - 50;
const SKIP_BUTTON_WIDTH = 160;
const SKIP_BUTTON_HEIGHT = 54;
const SKIP_BUTTON_MARGIN = 36;
const UPGRADE_COST_SCHEDULE = [50, 150, 300];

export class DiceUpgradeUI {
    constructor(scene, { dice = [], onUpgrade, onClose } = {}) {
        this.scene = scene;
        this.options = Array.isArray(dice) ? dice : [];
        this.onUpgrade = typeof onUpgrade === 'function' ? onUpgrade : () => false;
        this.onClose = typeof onClose === 'function' ? onClose : () => {};

        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.cardEntries = [];
        this.selectedEntries = new Map();
        this.upgradeButton = null;
        this.skipButton = null;
        this.currentUpgradeCost = 0;
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
            title: 'Upgrade Dice',
            titleStyle: {
                fontSize: '40px',
                color: '#f1c40f',
                fontStyle: 'bold'
            },
            subtitle: 'Select dice to upgrade. Costs: 50g → 150g → 300g.',
            subtitleStyle: {
                fontSize: '22px',
                color: '#f9e79f'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.renderOptions();
        this.createUpgradeButton();
        this.createSkipButton();
        this.updateUpgradeButtonState();
    }

    renderOptions() {
        this.cardEntries.forEach(entry => entry.container.destroy(true));
        this.cardEntries = [];

        const cardSpacing = CARD_WIDTH + CARD_GAP;
        const count = this.options.length;
        const startX = count > 1 ? -((count - 1) * cardSpacing) / 2 : 0;
        const cardY = 10;

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
                padding: EMOJI_TEXT_PADDING
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

            const checkboxContainer = this.scene.add.container(0, CARD_HEIGHT / 2 - 75);
            const checkboxBg = this.scene.add.rectangle(0, 0, CHECKBOX_WIDTH, CHECKBOX_HEIGHT, 0x000000, 0)
                .setInteractive({ useHandCursor: true });

            const box = this.scene.add.rectangle(0, 0, CHECKBOX_BOX_SIZE, CHECKBOX_BOX_SIZE, 0x271438, 0.9)
                .setStrokeStyle(2, 0xf1c40f, 0.85);

            const checkmark = this.scene.add.text(0, 0, '✔', {
                fontSize: '20px',
                color: '#f1c40f'
            }).setOrigin(0.5);
            checkmark.setVisible(false);

            const label = this.scene.add.text(0, CHECKBOX_BOX_SIZE / 2 + 10, 'Select', {
                fontSize: '18px',
                color: '#f9e79f',
                align: 'center'
            }).setOrigin(0.5, 0);

            checkboxBg.on('pointerover', () => {
                box.setFillStyle(0x2f1c44, 0.95);
            });

            checkboxBg.on('pointerout', () => {
                const isSelected = this.selectedEntries.has(option.uid);
                box.setFillStyle(isSelected ? 0x2f1c44 : 0x271438, isSelected ? 0.95 : 0.9);
            });

            checkboxBg.on('pointerup', () => {
                this.toggleSelection(option.uid);
            });

            checkboxContainer.add([checkboxBg, box, checkmark, label]);

            cardContainer.add([cardBg, icon, nameText, descriptionText, checkboxContainer]);
            this.container.add(cardContainer);

            const entry = {
                option,
                container: cardContainer,
                icon,
                nameText,
                descriptionText,
                checkbox: { container: checkboxContainer, background: checkboxBg, box, checkmark, label }
            };

            this.cardEntries.push(entry);
            this.updateCardEntry(entry);
        });

        this.updateSkipButtonLayout();
    }

    createUpgradeButton() {
        const buttonContainer = this.scene.add.container(0, BUTTON_OFFSET_Y);
        const buttonBg = this.scene.add.rectangle(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT, 0x271438, 0.92)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });

        const buttonText = this.scene.add.text(0, 0, 'Select dice', {
            fontSize: '22px',
            color: '#f9e79f',
            fontStyle: 'bold'
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
            if (!buttonContainer.visible || !buttonBg.input || !buttonBg.input.enabled) {
                return;
            }

            const selections = Array.from(this.selectedEntries.values());
            if (selections.length === 0) {
                return;
            }

            const upgraded = this.onUpgrade(selections, this.currentUpgradeCost || 0);
            if (upgraded) {
                if (this.scene.sound && typeof this.scene.sound.play === 'function') {
                    this.scene.sound.play('chimeLong', {
                        volume: 0.5,
                        seek: 1,
                        rate: 2.5
                        
                    });
                }
                this.destroy();
                this.onClose();
            }
        });

        buttonContainer.add([buttonBg, buttonText]);
        this.container.add(buttonContainer);

        this.upgradeButton = { container: buttonContainer, background: buttonBg, text: buttonText };
        setRectangleButtonEnabled(buttonBg, false);
    }

    createSkipButton() {
        const buttonContainer = this.scene.add.container(0, 0);
        const buttonBg = this.scene.add.rectangle(0, 0, SKIP_BUTTON_WIDTH, SKIP_BUTTON_HEIGHT, 0x271438, 0.92)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });

        const buttonText = this.scene.add.text(0, 0, 'Skip', {
            fontSize: '20px',
            color: '#f9e79f',
            fontStyle: 'bold'
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
            if (!buttonContainer.visible || !buttonBg.input || !buttonBg.input.enabled) {
                return;
            }

            if (this.scene.sound && typeof this.scene.sound.play === 'function') {
                this.scene.sound.play('tock', { volume: 0.5 });
            }

            this.destroy();
            this.onClose();
        });

        buttonContainer.add([buttonBg, buttonText]);
        this.container.add(buttonContainer);

        this.skipButton = { container: buttonContainer, background: buttonBg, text: buttonText };
        setRectangleButtonEnabled(buttonBg, true);
        this.updateSkipButtonLayout();
    }

    getRightmostOptionEdgeX() {
        if (!Array.isArray(this.cardEntries) || this.cardEntries.length === 0) {
            return null;
        }

        return this.cardEntries.reduce((max, entry) => {
            const edgeX = entry && entry.container ? entry.container.x + CARD_WIDTH / 2 : -Infinity;
            return Math.max(max, edgeX);
        }, -Infinity);
    }

    updateSkipButtonLayout() {
        if (!this.skipButton || !this.skipButton.container) {
            return;
        }

        const rightEdge = this.getRightmostOptionEdgeX();
        const fallbackX = PANEL_WIDTH / 2 - SKIP_BUTTON_WIDTH / 2 - SKIP_BUTTON_MARGIN;
        const targetX = Number.isFinite(rightEdge) ? rightEdge - SKIP_BUTTON_WIDTH / 2 : fallbackX;

        const upgradeButtonY = this.upgradeButton && this.upgradeButton.container
            ? this.upgradeButton.container.y
            : PANEL_HEIGHT / 2 - SKIP_BUTTON_HEIGHT / 2 - SKIP_BUTTON_MARGIN;

        this.skipButton.container.setPosition(targetX, upgradeButtonY);
    }

    getUpgradeCostForSelection(count) {
        if (!Number.isFinite(count) || count <= 0) {
            return 0;
        }

        const index = Math.min(count - 1, UPGRADE_COST_SCHEDULE.length - 1);
        return UPGRADE_COST_SCHEDULE[index];
    }

    toggleSelection(uid) {
        if (!uid) {
            return;
        }

        if (this.selectedEntries.has(uid)) {
            if (this.scene.sound && typeof this.scene.sound.play === 'function') {
                this.scene.sound.play('tock', {volume: 0.5});
            }
            this.selectedEntries.delete(uid);
        } else {
            const option = this.options.find(opt => opt.uid === uid);
            if (option) {
                this.selectedEntries.set(uid, option);
                if (this.scene.sound && typeof this.scene.sound.play === 'function') {
                    this.scene.sound.play('tick', {volume: 0.5});
                }
            }
        }

        this.updateAllCardEntries();
        this.updateUpgradeButtonState();
    }

    updateAllCardEntries() {
        this.cardEntries.forEach(entry => this.updateCardEntry(entry));
    }

    updateCardEntry(entry) {
        if (!entry) {
            return;
        }

        const { option, nameText, descriptionText, checkbox } = entry;
        const isSelected = this.selectedEntries.has(option.uid);

        const baseName = option.name || 'Unknown';
        const displayName = isSelected ? ` ${baseName}+` : ` ${baseName} `;
        const nameColor = isSelected ? '#f1c40f' : '#ffffff';

        nameText.setText(displayName);
        nameText.setTint(getBitmapTint(nameColor));

        const description = isSelected
            ? option.upgradeDescription || option.description || ''
            : option.description || '';

        descriptionText.setText(description);

        if (checkbox && checkbox.box) {
            checkbox.box.setFillStyle(isSelected ? 0x2f1c44 : 0x271438, isSelected ? 0.95 : 0.9);
        }
        if (checkbox && checkbox.checkmark) {
            checkbox.checkmark.setVisible(isSelected);
        }
        if (checkbox && checkbox.label) {
            checkbox.label.setText(isSelected ? 'Selected' : 'Select');
        }
    }

    updateUpgradeButtonState() {
        if (!this.upgradeButton) {
            return;
        }

        const selectionCount = this.selectedEntries.size;
        const cost = this.getUpgradeCostForSelection(selectionCount);
        const hasSelection = selectionCount > 0;

        this.currentUpgradeCost = cost;

        const { container, text, background } = this.upgradeButton;
        container.setVisible(true);

        if (!hasSelection) {
            text.setText('Select dice');
            setRectangleButtonEnabled(background, false);
            return;
        }

        const sceneCanAfford = this.scene
            && typeof this.scene.canAfford === 'function'
            ? this.scene.canAfford(cost)
            : typeof this.scene.playerGold === 'number'
                ? this.scene.playerGold >= cost
                : true;

        if (cost <= 0 || sceneCanAfford) {
            text.setText(`Upgrade (${cost}g)`);
            setRectangleButtonEnabled(background, true);
        } else {
            text.setText('Not enough gold');
            setRectangleButtonEnabled(background, false);
        }
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;

        this.cardEntries.forEach(entry => {
            if (entry && entry.container) {
                entry.container.destroy(true);
            }
        });
        this.cardEntries = [];
        this.selectedEntries.clear();

        if (this.upgradeButton && this.upgradeButton.container) {
            this.upgradeButton.container.destroy(true);
        }
        this.upgradeButton = null;

        if (this.skipButton && this.skipButton.container) {
            this.skipButton.container.destroy(true);
        }
        this.skipButton = null;

        if (this.backdrop) {
            this.backdrop.destroy();
            this.backdrop = null;
        }

        destroyModal(this.modal);
        this.modal = null;
        this.container = null;
    }
}
