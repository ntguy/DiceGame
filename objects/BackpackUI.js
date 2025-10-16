import { CONSTANTS } from '../config.js';
import { getCustomDieDefinitionById, MAX_CUSTOM_DICE, createDieBlueprint } from '../dice/CustomDiceDefinitions.js';
import { createModal, destroyModal } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';

const PANEL_VERTICAL_PADDING = 48;
const COLUMN_GAP = 36;
const ROW_VERTICAL_SPACING = 36;
const ROW_HORIZONTAL_PADDING = 28;
const DICE_SLOT_SIZE = 74;
const RELIC_SLOT_RADIUS = 38;

const DICE_SECTION_BACKGROUND_COLOR = 0x1a2b3a;
const RELIC_SECTION_BACKGROUND_COLOR = 0x2e1a38;
const INFO_SECTION_BACKGROUND_COLOR = 0x0d1620;
const INFO_SECTION_STROKE_COLOR = 0x3a6073;
const DICE_SLOT_FILL_COLOR = 0x11202e;
const DICE_SLOT_EMPTY_FILL_COLOR = 0x0b141d;
const DICE_SLOT_STROKE_COLOR = 0x58a6ff;
const DICE_SLOT_SELECTED_FILL_COLOR = 0x1f4f7a;
const RELIC_SLOT_FILL_COLOR = 0x2b1425;
const RELIC_SLOT_EMPTY_FILL_COLOR = 0x1a0c16;
const RELIC_SLOT_STROKE_COLOR = 0xf5b7b1;
const RELIC_SLOT_SELECTED_FILL_COLOR = 0x7d3c98;
const SECTION_LABEL_COLOR = '#f1f8ff';
const SECTION_LABEL_FONT_SIZE = '24px';
const INFO_TITLE_COLOR = '#f7dc6f';
const INFO_TITLE_FONT_SIZE = '26px';
const INFO_DESCRIPTION_COLOR = '#ecf0f1';
const INFO_DESCRIPTION_FONT_SIZE = '20px';
const INFO_SUBTEXT_COLOR = '#85929e';
const CLOSE_BUTTON_FILL_COLOR = 0x1b2631;
const CLOSE_BUTTON_TEXT_COLOR = '#d6eaf8';

const DEFAULT_EMPTY_DIE_TEXT = {
    name: 'Empty Slot',
    description: 'You have room to add another die to your loadout.'
};

const DEFAULT_EMPTY_RELIC_TEXT = {
    name: 'Empty Relic Slot',
    description: 'You can carry up to six relics. Find more on your journey!'
};

export class BackpackUI {
    constructor(scene) {
        this.scene = scene;
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.diceSlots = [];
        this.relicSlots = [];
        this.infoTitleText = null;
        this.infoDescriptionText = null;
        this.infoHintText = null;
        this.closeButton = null;
        this.isVisible = false;
        this.selectedDiceIndex = null;
        this.selectedRelicIndex = null;

        this.create();
        this.setVisible(false);
    }

    create() {
        const panelWidth = Math.max(720, Math.min(this.scene.scale.width - 40, this.scene.scale.width));
        const panelHeight = Math.max(520, Math.min(this.scene.scale.height - 40, this.scene.scale.height));

        const modal = createModal(this.scene, {
            width: panelWidth,
            height: panelHeight,
            panelColor: 0x05080d,
            panelAlpha: 0.96,
            strokeColor: 0x58a6ff,
            strokeAlpha: 0.85,
            strokeWidth: 4,
            depth: 120
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        if (this.backdrop) {
            this.backdrop.on('pointerup', () => {
                this.scene.closeBackpack();
            });
        }

        const panelLeft = -panelWidth / 2;
        const panelRight = panelWidth / 2;
        const panelTop = -panelHeight / 2 + PANEL_VERTICAL_PADDING;
        const panelBottom = panelHeight / 2 - PANEL_VERTICAL_PADDING;
        const leftColumnWidth = panelWidth * (2 / 3) - COLUMN_GAP;
        const rightColumnWidth = panelWidth - leftColumnWidth - COLUMN_GAP * 2;
        const leftColumnCenterX = panelLeft + COLUMN_GAP + leftColumnWidth / 2;
        const rightColumnCenterX = panelRight - COLUMN_GAP - rightColumnWidth / 2;

        const rowHeight = Math.max(DICE_SLOT_SIZE + 56, (panelBottom - panelTop - ROW_VERTICAL_SPACING) / 2);
        const topRowCenterY = panelTop + rowHeight / 2;
        const bottomRowCenterY = topRowCenterY + rowHeight + ROW_VERTICAL_SPACING;

        this.createDiceSection({
            centerX: leftColumnCenterX,
            centerY: topRowCenterY,
            width: leftColumnWidth,
            height: rowHeight
        });

        this.createRelicSection({
            centerX: leftColumnCenterX,
            centerY: bottomRowCenterY,
            width: leftColumnWidth,
            height: rowHeight
        });

        this.createInfoSection({
            centerX: rightColumnCenterX,
            top: panelTop,
            bottom: panelBottom,
            width: rightColumnWidth
        });
    }

    createDiceSection({ centerX, centerY, width, height }) {
        const background = this.scene.add.rectangle(centerX, centerY, width, height, DICE_SECTION_BACKGROUND_COLOR, 0.9)
            .setStrokeStyle(2, DICE_SLOT_STROKE_COLOR, 0.35);
        this.container.add(background);

        const label = this.scene.add.text(centerX - width / 2 + 18, centerY - height / 2 + 14, 'Dice', {
            fontSize: SECTION_LABEL_FONT_SIZE,
            color: SECTION_LABEL_COLOR,
            fontStyle: 'bold'
        }).setOrigin(0, 0);
        this.container.add(label);

        const slotAreaWidth = width - ROW_HORIZONTAL_PADDING * 2;
        const slotSpacing = MAX_CUSTOM_DICE > 1
            ? Math.max(12, (slotAreaWidth - DICE_SLOT_SIZE * MAX_CUSTOM_DICE) / (MAX_CUSTOM_DICE - 1))
            : 0;
        const startX = centerX - slotAreaWidth / 2 + DICE_SLOT_SIZE / 2;

        this.diceSlots = Array.from({ length: MAX_CUSTOM_DICE }, (_, index) => {
            const x = startX + index * (DICE_SLOT_SIZE + slotSpacing);
            const slotContainer = this.scene.add.container(x, centerY + 12);

            const slotBackground = this.scene.add.rectangle(0, 0, DICE_SLOT_SIZE, DICE_SLOT_SIZE, DICE_SLOT_EMPTY_FILL_COLOR, 0.85)
                .setStrokeStyle(2, DICE_SLOT_STROKE_COLOR, 0.25)
                .setInteractive({ useHandCursor: true });

            const emojiText = this.scene.add.text(0, 0, '', {
                fontSize: '32px',
                color: '#ffffff'
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(0, DICE_SLOT_SIZE / 2 + 16, '', {
                fontSize: '16px',
                color: INFO_SUBTEXT_COLOR,
                align: 'center',
                wordWrap: { width: DICE_SLOT_SIZE + 12 }
            }).setOrigin(0.5, 0);

            slotBackground.on('pointerup', () => {
                this.handleDiceSlotClick(index);
            });

            slotContainer.add(slotBackground);
            slotContainer.add(emojiText);
            slotContainer.add(labelText);
            this.container.add(slotContainer);

            return {
                container: slotContainer,
                background: slotBackground,
                emojiText,
                labelText,
                data: null
            };
        });
    }

    createRelicSection({ centerX, centerY, width, height }) {
        const background = this.scene.add.rectangle(centerX, centerY, width, height, RELIC_SECTION_BACKGROUND_COLOR, 0.9)
            .setStrokeStyle(2, RELIC_SLOT_STROKE_COLOR, 0.35);
        this.container.add(background);

        const label = this.scene.add.text(centerX - width / 2 + 18, centerY - height / 2 + 14, 'Relics', {
            fontSize: SECTION_LABEL_FONT_SIZE,
            color: SECTION_LABEL_COLOR,
            fontStyle: 'bold'
        }).setOrigin(0, 0);
        this.container.add(label);

        const slotsPerRow = CONSTANTS.RELIC_MAX_SLOTS;
        const slotAreaWidth = width - ROW_HORIZONTAL_PADDING * 2;
        const slotSpacing = slotsPerRow > 1
            ? Math.max(18, (slotAreaWidth - RELIC_SLOT_RADIUS * 2 * slotsPerRow) / (slotsPerRow - 1))
            : 0;
        const startX = centerX - slotAreaWidth / 2 + RELIC_SLOT_RADIUS;

        this.relicSlots = Array.from({ length: slotsPerRow }, (_, index) => {
            const x = startX + index * (RELIC_SLOT_RADIUS * 2 + slotSpacing);
            const slotContainer = this.scene.add.container(x, centerY + 12);

            const slotBackground = this.scene.add.circle(0, 0, RELIC_SLOT_RADIUS, RELIC_SLOT_EMPTY_FILL_COLOR, 0.9)
                .setStrokeStyle(2, RELIC_SLOT_STROKE_COLOR, 0.3)
                .setInteractive({ useHandCursor: true });

            const iconText = this.scene.add.text(0, 0, '', {
                fontSize: '30px',
                color: '#ffffff'
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(0, RELIC_SLOT_RADIUS + 18, '', {
                fontSize: '16px',
                color: INFO_SUBTEXT_COLOR,
                align: 'center',
                wordWrap: { width: RELIC_SLOT_RADIUS * 2 + 12 }
            }).setOrigin(0.5, 0);

            slotBackground.on('pointerup', () => {
                this.handleRelicSlotClick(index);
            });

            slotContainer.add(slotBackground);
            slotContainer.add(iconText);
            slotContainer.add(labelText);
            this.container.add(slotContainer);

            return {
                container: slotContainer,
                background: slotBackground,
                iconText,
                labelText,
                data: null
            };
        });
    }

    createInfoSection({ centerX, top, bottom, width }) {
        const height = bottom - top;
        const background = this.scene.add.rectangle(centerX, (top + bottom) / 2, width, height, INFO_SECTION_BACKGROUND_COLOR, 0.94)
            .setStrokeStyle(2, INFO_SECTION_STROKE_COLOR, 0.8);
        this.container.add(background);

        this.infoTitleText = this.scene.add.text(centerX, top + 24, 'Backpack', {
            fontSize: INFO_TITLE_FONT_SIZE,
            color: INFO_TITLE_COLOR,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: width - 48 }
        }).setOrigin(0.5, 0);
        this.container.add(this.infoTitleText);

        this.infoDescriptionText = this.scene.add.text(centerX, this.infoTitleText.y + 48, 'Select a die or relic to learn more about it.', {
            fontSize: INFO_DESCRIPTION_FONT_SIZE,
            color: INFO_DESCRIPTION_COLOR,
            align: 'left',
            wordWrap: { width: width - 48 },
            lineSpacing: 8
        }).setOrigin(0.5, 0);
        this.container.add(this.infoDescriptionText);

        this.infoHintText = this.scene.add.text(centerX, bottom - 110, 'Tip: Upgraded dice display their enhanced effects.', {
            fontSize: '16px',
            color: INFO_SUBTEXT_COLOR,
            align: 'center',
            wordWrap: { width: width - 48 }
        }).setOrigin(0.5, 0);
        this.container.add(this.infoHintText);

        const buttonWidth = width - 64;
        const buttonHeight = 54;
        const buttonY = bottom - 48;

        const buttonBackground = this.scene.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, CLOSE_BUTTON_FILL_COLOR, 0.95)
            .setStrokeStyle(2, INFO_SECTION_STROKE_COLOR, 0.85)
            .setInteractive({ useHandCursor: true });
        const buttonLabel = this.scene.add.text(centerX, buttonY, 'Close', {
            fontSize: '22px',
            color: CLOSE_BUTTON_TEXT_COLOR,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(buttonBackground, {
            baseColor: CLOSE_BUTTON_FILL_COLOR,
            baseAlpha: 0.95,
            hoverBlend: 0.16,
            pressBlend: 0.28,
            disabledBlend: 0.45,
            enabledAlpha: 1,
            disabledAlpha: 0.5
        });

        buttonBackground.on('pointerup', () => {
            this.scene.closeBackpack();
        });

        this.container.add(buttonBackground);
        this.container.add(buttonLabel);

        this.closeButton = { background: buttonBackground, label: buttonLabel };
    }

    open() {
        this.refreshContent();
        this.setVisible(true);
        this.isVisible = true;
    }

    close() {
        this.setVisible(false);
        this.isVisible = false;
        this.clearSelection();
    }

    setVisible(visible) {
        if (this.backdrop) {
            this.backdrop.setVisible(visible);
            if (visible) {
                this.backdrop.setInteractive({ useHandCursor: false });
            } else {
                this.backdrop.disableInteractive();
            }
        }
        if (this.container) {
            this.container.setVisible(visible);
        }
    }

    clearSelection() {
        this.selectedDiceIndex = null;
        this.selectedRelicIndex = null;
        this.updateDiceHighlights();
        this.updateRelicHighlights();
        if (this.infoTitleText && this.infoDescriptionText) {
            this.infoTitleText.setText('Backpack');
            this.infoDescriptionText.setText('Select a die or relic to learn more about it.');
        }
    }

    refreshContent() {
        this.refreshDiceSlots();
        this.refreshRelicSlots();
        this.updateDiceHighlights();
        this.updateRelicHighlights();
    }

    refreshDiceSlots() {
        if (!Array.isArray(this.diceSlots) || this.diceSlots.length === 0) {
            return;
        }

        const loadout = Array.isArray(this.scene.customDiceLoadout) ? [...this.scene.customDiceLoadout] : [];
        while (loadout.length < MAX_CUSTOM_DICE) {
            loadout.push(createDieBlueprint('standard'));
        }

        this.diceSlots.forEach((slot, index) => {
            const blueprint = loadout[index];
            if (blueprint && blueprint.id) {
                const definition = getCustomDieDefinitionById(blueprint.id);
                const name = blueprint.isUpgraded && definition.upgradeDescription
                    ? `${definition.name || 'Die'} +`
                    : definition.name || 'Die';
                const description = blueprint.isUpgraded && definition.upgradeDescription
                    ? definition.upgradeDescription
                    : definition.description || 'No description available.';
                slot.data = {
                    name,
                    description,
                    emoji: definition.emoji || '',
                    isUpgraded: !!blueprint.isUpgraded,
                    baseName: definition.name || blueprint.id
                };
                slot.background.setFillStyle(DICE_SLOT_FILL_COLOR, 0.95);
                slot.background.setStrokeStyle(2, DICE_SLOT_STROKE_COLOR, 0.9);
                slot.emojiText.setText(slot.data.emoji || '🎲');
                slot.emojiText.setAlpha(1);
                slot.labelText.setText(slot.data.baseName || '');
                slot.background.setInteractive({ useHandCursor: true });
            } else {
                slot.data = null;
                slot.background.setFillStyle(DICE_SLOT_EMPTY_FILL_COLOR, 0.7);
                slot.background.setStrokeStyle(2, DICE_SLOT_STROKE_COLOR, 0.2);
                slot.emojiText.setText('');
                slot.emojiText.setAlpha(0.65);
                slot.labelText.setText('');
                slot.background.setInteractive({ useHandCursor: true });
            }
        });
    }

    refreshRelicSlots() {
        if (!Array.isArray(this.relicSlots) || this.relicSlots.length === 0) {
            return;
        }

        const ownedRelics = Array.isArray(this.scene.relics)
            ? this.scene.relics.filter(relic => relic && this.scene.ownedRelicIds && this.scene.ownedRelicIds.has(relic.id))
            : [];
        const slots = this.relicSlots.length;

        for (let index = 0; index < slots; index += 1) {
            const slot = this.relicSlots[index];
            const relic = ownedRelics[index];
            if (relic) {
                slot.data = {
                    name: relic.name || 'Relic',
                    description: relic.description || 'No description available.',
                    icon: relic.icon || '♦'
                };
                slot.background.setFillStyle(RELIC_SLOT_FILL_COLOR, 0.95);
                slot.background.setStrokeStyle(2, RELIC_SLOT_STROKE_COLOR, 0.9);
                slot.iconText.setText(slot.data.icon || '♦');
                slot.iconText.setAlpha(1);
                slot.labelText.setText(slot.data.name || '');
                slot.background.setInteractive({ useHandCursor: true });
            } else {
                slot.data = null;
                slot.background.setFillStyle(RELIC_SLOT_EMPTY_FILL_COLOR, 0.65);
                slot.background.setStrokeStyle(2, RELIC_SLOT_STROKE_COLOR, 0.25);
                slot.iconText.setText('');
                slot.iconText.setAlpha(0.65);
                slot.labelText.setText('');
                slot.background.setInteractive({ useHandCursor: true });
            }
        }
    }

    handleDiceSlotClick(index) {
        if (!Array.isArray(this.diceSlots) || !this.diceSlots[index]) {
            return;
        }

        const data = this.diceSlots[index].data;
        if (data) {
            this.selectedDiceIndex = index;
            this.selectedRelicIndex = null;
            const description = data.isUpgraded
                ? data.description || DEFAULT_EMPTY_DIE_TEXT.description
                : data.description || DEFAULT_EMPTY_DIE_TEXT.description;
            this.showInfo(data.name || 'Die', description);
        } else {
            this.selectedDiceIndex = null;
            this.selectedRelicIndex = null;
            this.showInfo(DEFAULT_EMPTY_DIE_TEXT.name, DEFAULT_EMPTY_DIE_TEXT.description);
        }
        this.updateDiceHighlights();
        this.updateRelicHighlights();
    }

    handleRelicSlotClick(index) {
        if (!Array.isArray(this.relicSlots) || !this.relicSlots[index]) {
            return;
        }

        const data = this.relicSlots[index].data;
        if (data) {
            this.selectedRelicIndex = index;
            this.selectedDiceIndex = null;
            this.showInfo(data.name || 'Relic', data.description || DEFAULT_EMPTY_RELIC_TEXT.description);
        } else {
            this.selectedRelicIndex = null;
            this.selectedDiceIndex = null;
            this.showInfo(DEFAULT_EMPTY_RELIC_TEXT.name, DEFAULT_EMPTY_RELIC_TEXT.description);
        }
        this.updateDiceHighlights();
        this.updateRelicHighlights();
    }

    showInfo(title, description) {
        if (this.infoTitleText) {
            this.infoTitleText.setText(title || 'Backpack');
        }
        if (this.infoDescriptionText) {
            this.infoDescriptionText.setText(description || '');
        }
    }

    updateDiceHighlights() {
        if (!Array.isArray(this.diceSlots)) {
            return;
        }

        this.diceSlots.forEach((slot, index) => {
            const isSelected = index === this.selectedDiceIndex;
            const hasData = !!slot.data;
            const fillColor = isSelected
                ? DICE_SLOT_SELECTED_FILL_COLOR
                : hasData
                    ? DICE_SLOT_FILL_COLOR
                    : DICE_SLOT_EMPTY_FILL_COLOR;
            const fillAlpha = hasData || isSelected ? 0.95 : 0.7;
            const strokeAlpha = isSelected ? 1 : hasData ? 0.9 : 0.2;
            slot.background.setFillStyle(fillColor, fillAlpha);
            slot.background.setStrokeStyle(2, DICE_SLOT_STROKE_COLOR, strokeAlpha);
        });
    }

    updateRelicHighlights() {
        if (!Array.isArray(this.relicSlots)) {
            return;
        }

        this.relicSlots.forEach((slot, index) => {
            const isSelected = index === this.selectedRelicIndex;
            const hasData = !!slot.data;
            const fillColor = isSelected
                ? RELIC_SLOT_SELECTED_FILL_COLOR
                : hasData
                    ? RELIC_SLOT_FILL_COLOR
                    : RELIC_SLOT_EMPTY_FILL_COLOR;
            const fillAlpha = hasData || isSelected ? 0.95 : 0.65;
            const strokeAlpha = isSelected ? 1 : hasData ? 0.9 : 0.25;
            slot.background.setFillStyle(fillColor, fillAlpha);
            slot.background.setStrokeStyle(2, RELIC_SLOT_STROKE_COLOR, strokeAlpha);
        });
    }

    destroy() {
        destroyModal(this.modal);
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.diceSlots = [];
        this.relicSlots = [];
        this.infoTitleText = null;
        this.infoDescriptionText = null;
        this.infoHintText = null;
        this.closeButton = null;
        this.isVisible = false;
    }
}
