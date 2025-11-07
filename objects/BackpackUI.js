import { CONSTANTS } from '../constants.js';
import { getCustomDieDefinitionById, MAX_CUSTOM_DICE, createDieBlueprint } from '../dice/CustomDiceDefinitions.js';
import { createModal, destroyModal } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle, setRectangleButtonEnabled } from './ui/ButtonStyles.js';
import { getBitmapTint } from '../utils/bitmapTextFactory.js';

const COLUMN_GAP = 24;
const ROW_VERTICAL_SPACING = 28;
const ROW_HORIZONTAL_PADDING = 28;
const DICE_SLOT_SIZE = 74;
const BASE_RELIC_SLOT_RADIUS = 34;
const COMPACT_RELIC_SLOT_RADIUS = 30;
const BASE_RELIC_SLOT_MIN_SPACING = 18;
const COMPACT_RELIC_SLOT_MIN_SPACING = 14;
const BASE_RELIC_LABEL_FONT_SIZE = '17px';
const COMPACT_RELIC_LABEL_FONT_SIZE = '17px';
const BASE_RELIC_LABEL_WRAP_PADDING = 12;
const COMPACT_RELIC_LABEL_WRAP_PADDING = 10;
const COMPACT_RELIC_THRESHOLD = 7;

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
const SECTION_LABEL_FONT_SIZE = '32px';
const INFO_TITLE_COLOR = '#f7dc6f';
const INFO_TITLE_FONT_SIZE = '32px';
const INFO_DESCRIPTION_COLOR = '#ecf0f1';
const INFO_DESCRIPTION_FONT_SIZE = '32px';
const INFO_SUBTEXT_COLOR = '#85929e';
const INFO_UPGRADED_COLOR = '#f4d03f';
const CLOSE_BUTTON_FILL_COLOR = 0x1b2631;
const CLOSE_BUTTON_TEXT_COLOR = '#d6eaf8';
const DISCARD_BUTTON_FILL_COLOR = 0x7f1d2d;
const DISCARD_BUTTON_STROKE_COLOR = 0xffc2c7;
const DISCARD_BUTTON_TEXT_COLOR = '#ffe6eb';

const DEFAULT_EMPTY_DIE_TEXT = {
    name: 'Empty Slot',
    description: 'You have room to add another die to your loadout.'
};

const DEFAULT_EMPTY_RELIC_TEXT = {
    name: 'Empty Relic Slot',
    description: 'You can carry a limited number of relics. Find more on your journey!'
};

export class BackpackUI {
    constructor(scene) {
        this.scene = scene;
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.diceSlots = [];
        this.relicSlots = [];
        this.diceInfoTitleText = null;
        this.diceInfoDescriptionText = null;
        this.relicInfoTitleText = null;
        this.relicInfoDescriptionText = null;
        this.closeButton = null;
        this.isVisible = false;
        this.selectedDiceIndex = null;
        this.selectedRelicIndex = null;
        this.diceDiscardButton = null;
        this.relicDiscardButton = null;
        this.relicSlotCount = 0;
        this.relicSectionConfig = null;

        this.create();
        this.setVisible(false);
    }

    create() {
        const panelWidth = Math.max(720, this.scene.scale.width - 40);
        const panelHeight = Math.max(450, this.scene.scale.height - 150);

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

        const panelLeft = -panelWidth / 2;
        const panelRight = panelWidth / 2;
        const panelTop = -panelHeight / 2;
        const panelBottom = panelHeight / 2;
        const contentLeft = panelLeft + COLUMN_GAP;
        const contentRight = panelRight - COLUMN_GAP;
        const totalContentWidth = contentRight - contentLeft;
        const infoGap = COLUMN_GAP;
        const sectionWidth = totalContentWidth * 0.6;
        const infoWidth = totalContentWidth - sectionWidth - infoGap;
        const sectionCenterX = contentLeft + sectionWidth / 2;
        const infoCenterX = contentRight - infoWidth / 2;

        const availableHeight = panelBottom - panelTop;
        const sectionHeight = (availableHeight - ROW_VERTICAL_SPACING);
        const diceHeight = Math.max(DICE_SLOT_SIZE + 28, sectionHeight * 0.4);
        const initialRelicSlotCount = this.getDesiredRelicSlotCount();
        const { radius: initialRelicRadius } = this.getRelicSlotVisualSettings(initialRelicSlotCount);
        const relicHeight = Math.max(initialRelicRadius * 2 + 52, sectionHeight * 0.4);
        const diceCenterY = panelTop + ROW_VERTICAL_SPACING + diceHeight / 2;
        const relicCenterY = diceCenterY + diceHeight / 2 + ROW_VERTICAL_SPACING + relicHeight / 2;

        this.createDiceSection({
            centerX: sectionCenterX,
            centerY: diceCenterY,
            width: sectionWidth,
            height: diceHeight
        });

        this.createDiceInfoSection({
            centerX: infoCenterX,
            centerY: diceCenterY,
            width: infoWidth,
            height: diceHeight
        });

        this.createRelicSection({
            centerX: sectionCenterX,
            centerY: relicCenterY,
            width: sectionWidth,
            height: relicHeight
        });

        this.createRelicInfoSection({
            centerX: infoCenterX,
            centerY: relicCenterY,
            width: infoWidth,
            height: relicHeight
        });

        this.createCloseButton({
            right: contentRight,
            y: panelBottom - 44,
            width: infoWidth,
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
            const slotContainer = this.scene.add.container(x, centerY);

            const slotBackground = this.scene.add.rectangle(0, 0, DICE_SLOT_SIZE, DICE_SLOT_SIZE, DICE_SLOT_EMPTY_FILL_COLOR, 0.85)
                .setStrokeStyle(2, DICE_SLOT_STROKE_COLOR, 0.25)
                .setInteractive({ useHandCursor: true });

            const emojiText = this.scene.add.text(0, 0, '', {
                fontSize: '32px',
                color: '#ffffff',
                forceNormalText: true,
                padding: CONSTANTS.EMOJI_TEXT_PADDING,
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(0, DICE_SLOT_SIZE / 2 + 16, '', {
                fontSize: '17px',
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

    createDiceInfoSection({ centerX, centerY, width, height }) {
        const background = this.scene.add.rectangle(centerX, centerY, width, height, INFO_SECTION_BACKGROUND_COLOR, 0.94)
            .setStrokeStyle(2, INFO_SECTION_STROKE_COLOR, 0.8);
        this.container.add(background);

        this.diceInfoTitleText = this.scene.add.text(centerX, centerY - height / 2 + 10, 'Backpack', {
            fontSize: INFO_TITLE_FONT_SIZE,
            color: INFO_TITLE_COLOR,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: width - 48 }
        }).setOrigin(0.5, 0);
        this.container.add(this.diceInfoTitleText);

        this.diceInfoDescriptionText = this.scene.add.text(centerX, this.diceInfoTitleText.y + 32, 'Select a die to learn more about it.', {
            fontSize: INFO_DESCRIPTION_FONT_SIZE,
            color: INFO_DESCRIPTION_COLOR,
            align: 'left',
            wordWrap: { width: width - 48 },
            lineSpacing: 8
        }).setOrigin(0.5, 0);
        this.container.add(this.diceInfoDescriptionText);

        const buttonWidth = Math.max(200, width - 48);
        const buttonHeight = 48;
        const buttonY = centerY + height / 2 - buttonHeight / 2 - 16;

        const buttonBackground = this.scene.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, DISCARD_BUTTON_FILL_COLOR, 0.95)
            .setStrokeStyle(2, DISCARD_BUTTON_STROKE_COLOR, 0.85)
            .setInteractive({ useHandCursor: true });

        const buttonLabel = this.scene.add.text(centerX, buttonY, 'Discard Die', {
            fontSize: '32px',
            color: DISCARD_BUTTON_TEXT_COLOR,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(buttonBackground, {
            baseColor: DISCARD_BUTTON_FILL_COLOR,
            baseAlpha: 0.95,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            disabledBlend: 0.4,
            enabledAlpha: 1,
            disabledAlpha: 0.25
        });

        buttonBackground.on('pointerup', () => {
            if (!buttonBackground.visible || !buttonBackground.input || !buttonBackground.input.enabled) {
                return;
            }
            this.handleDiscardSelectedDie();
        });

        this.container.add(buttonBackground);
        this.container.add(buttonLabel);

        this.diceDiscardButton = { background: buttonBackground, label: buttonLabel };
        buttonBackground.setVisible(false);
        buttonLabel.setVisible(false);
        setRectangleButtonEnabled(buttonBackground, false);

        return {
            top: centerY - height / 2,
            bottom: centerY + height / 2
        };
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

        this.relicSectionConfig = { centerX, centerY, width, height };
        this.ensureRelicSlotCount();
    }

    getDesiredRelicSlotCount() {
        if (this.scene && typeof this.scene.getRelicSlotLimit === 'function') {
            const limit = this.scene.getRelicSlotLimit();
            if (typeof limit === 'number' && limit >= 0) {
                return Math.floor(limit);
            }
        }
        return CONSTANTS.RELIC_MAX_SLOTS;
    }

    getRelicSlotVisualSettings(slotCount = this.getDesiredRelicSlotCount()) {
        const count = Math.max(0, Math.floor(slotCount));
        const useCompactLayout = count >= COMPACT_RELIC_THRESHOLD;
        return {
            radius: useCompactLayout ? COMPACT_RELIC_SLOT_RADIUS : BASE_RELIC_SLOT_RADIUS,
            minSpacing: useCompactLayout ? COMPACT_RELIC_SLOT_MIN_SPACING : BASE_RELIC_SLOT_MIN_SPACING,
            labelFontSize: useCompactLayout ? COMPACT_RELIC_LABEL_FONT_SIZE : BASE_RELIC_LABEL_FONT_SIZE,
            labelWrapPadding: useCompactLayout ? COMPACT_RELIC_LABEL_WRAP_PADDING : BASE_RELIC_LABEL_WRAP_PADDING
        };
    }

    ensureRelicSlotCount() {
        const desiredCount = this.getDesiredRelicSlotCount();
        this.rebuildRelicSlots(desiredCount);
    }

    rebuildRelicSlots(slotCount) {
        if (!this.relicSectionConfig) {
            return;
        }

        const count = Math.max(0, Math.floor(slotCount));
        if (count === this.relicSlotCount && Array.isArray(this.relicSlots) && this.relicSlots.length === count) {
            return;
        }

        if (Array.isArray(this.relicSlots)) {
            this.relicSlots.forEach(slot => {
                if (slot && slot.container) {
                    slot.container.destroy(true);
                }
            });
        }

        this.relicSlots = [];
        this.relicSlotCount = count;

        if (typeof this.selectedRelicIndex === 'number' && this.selectedRelicIndex >= count) {
            this.selectedRelicIndex = null;
        }

        if (count <= 0) {
            return;
        }

        const { centerX, centerY, width } = this.relicSectionConfig;
        const { radius, minSpacing, labelFontSize, labelWrapPadding } = this.getRelicSlotVisualSettings(count);
        const slotAreaWidth = width - ROW_HORIZONTAL_PADDING * 2;
        const slotSpacing = count > 1
            ? Math.max(minSpacing, (slotAreaWidth - radius * 2 * count) / (count - 1))
            : 0;
        const startX = centerX - slotAreaWidth / 2 + radius;

        this.relicSlots = Array.from({ length: count }, (_, index) => {
            const x = startX + index * (radius * 2 + slotSpacing);
            const slotContainer = this.scene.add.container(x, centerY);

            const slotBackground = this.scene.add.circle(0, 0, radius, RELIC_SLOT_EMPTY_FILL_COLOR, 0.9)
                .setStrokeStyle(2, RELIC_SLOT_STROKE_COLOR, 0.3)
                .setInteractive({ useHandCursor: true });

            const iconText = this.scene.add.text(0, 0, '', {
                fontSize: '32px',
                color: '#ffffff',
                forceNormalText: true,
                padding: CONSTANTS.EMOJI_TEXT_PADDING,
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(0, radius + 16, '', {
                fontSize: labelFontSize,
                color: INFO_SUBTEXT_COLOR,
                align: 'center',
                wordWrap: { width: radius * 2 + labelWrapPadding }
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

    createRelicInfoSection({ centerX, centerY, width, height }) {
        const background = this.scene.add.rectangle(centerX, centerY, width, height, INFO_SECTION_BACKGROUND_COLOR, 0.94)
            .setStrokeStyle(2, INFO_SECTION_STROKE_COLOR, 0.8);
        this.container.add(background);

        this.relicInfoTitleText = this.scene.add.text(centerX, centerY - height / 2 + 10, 'Backpack', {
            fontSize: INFO_TITLE_FONT_SIZE,
            color: INFO_TITLE_COLOR,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: width - 48 }
        }).setOrigin(0.5, 0);
        this.container.add(this.relicInfoTitleText);

        this.relicInfoDescriptionText = this.scene.add.text(centerX, this.relicInfoTitleText.y + 32, 'Select a relic to learn more about it.', {
            fontSize: INFO_DESCRIPTION_FONT_SIZE,
            color: INFO_DESCRIPTION_COLOR,
            align: 'left',
            wordWrap: { width: width - 48 },
            lineSpacing: 8
        }).setOrigin(0.5, 0);
        this.container.add(this.relicInfoDescriptionText);

        const buttonWidth = Math.max(200, width - 48);
        const buttonHeight = 48;
        const buttonY = centerY + height / 2 - buttonHeight / 2 - 16;

        const buttonBackground = this.scene.add.rectangle(centerX, buttonY, buttonWidth, buttonHeight, DISCARD_BUTTON_FILL_COLOR, 0.95)
            .setStrokeStyle(2, DISCARD_BUTTON_STROKE_COLOR, 0.85)
            .setInteractive({ useHandCursor: true });

        const buttonLabel = this.scene.add.text(centerX, buttonY, 'Sell (50g)', {
            fontSize: '32px',
            color: DISCARD_BUTTON_TEXT_COLOR,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(buttonBackground, {
            baseColor: DISCARD_BUTTON_FILL_COLOR,
            baseAlpha: 0.95,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            disabledBlend: 0.4,
            enabledAlpha: 1,
            disabledAlpha: 0.25
        });

        buttonBackground.on('pointerup', () => {
            if (!buttonBackground.visible || !buttonBackground.input || !buttonBackground.input.enabled) {
                return;
            }
            this.handleDiscardSelectedRelic();
        });

        this.container.add(buttonBackground);
        this.container.add(buttonLabel);

        this.relicDiscardButton = { background: buttonBackground, label: buttonLabel };
        buttonBackground.setVisible(false);
        buttonLabel.setVisible(false);
        setRectangleButtonEnabled(buttonBackground, false);

        return {
            top: centerY - height / 2,
            bottom: centerY + height / 2,
            right: centerX + width / 2
        };
    }

    createCloseButton({ right, y, width }) {
        const buttonWidth = width;
        const buttonHeight = 54;

        const buttonBackground = this.scene.add.rectangle(right, y, buttonWidth, buttonHeight, CLOSE_BUTTON_FILL_COLOR, 0.95)
            .setOrigin(1, 0.5)
            .setStrokeStyle(2, INFO_SECTION_STROKE_COLOR, 0.85)
            .setInteractive({ useHandCursor: true });
        const buttonLabel = this.scene.add.text(right - buttonWidth / 2, y, 'Close', {
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

        if (!this.isVisible && this.scene) {
            if (typeof this.scene.acquireModalInputLock === 'function') {
                this.scene.acquireModalInputLock();
            } else if (this.scene.input) {
                this.scene.input.setTopOnly(true);
            }
        }

        this.setVisible(true);
        this.isVisible = true;
    }

    close() {
        if (this.isVisible && this.scene) {
            if (typeof this.scene.releaseModalInputLock === 'function') {
                this.scene.releaseModalInputLock();
            } else if (this.scene.input) {
                this.scene.input.setTopOnly(false);
            }
        }

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
        this.showDefaultDiceInfo();
        this.showDefaultRelicInfo();
        this.updateDiceDiscardButtonState();
        this.updateRelicDiscardButtonState();
    }

    refreshContent() {
        this.ensureRelicSlotCount();
        this.refreshDiceSlots();
        this.refreshRelicSlots();
        this.updateDiceHighlights();
        this.updateRelicHighlights();
        if (this.selectedDiceIndex === null) {
            this.showDefaultDiceInfo();
        }
        if (this.selectedRelicIndex === null) {
            this.showDefaultRelicInfo();
        }
        this.updateDiceDiscardButtonState();
        this.updateRelicDiscardButtonState();
    }

    refreshDiceSlots() {
        if (!Array.isArray(this.diceSlots) || this.diceSlots.length === 0) {
            this.updateDiceDiscardButtonState();
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
                    ? `${definition.name || 'Die'}+`
                    : definition.name || 'Die';
                const description = blueprint.isUpgraded && definition.upgradeDescription
                    ? definition.upgradeDescription
                    : definition.description || 'No description available.';
                slot.data = {
                    id: blueprint.id,
                    uid: blueprint.uid,
                    name,
                    description,
                    emoji: definition.emoji || '',
                    isUpgraded: !!blueprint.isUpgraded,
                    baseName: definition.name || blueprint.id
                };
                slot.background.setFillStyle(DICE_SLOT_FILL_COLOR, 0.95);
                slot.background.setStrokeStyle(2, DICE_SLOT_STROKE_COLOR, 0.9);
                slot.emojiText.setText(slot.data.emoji || ' ');
                slot.emojiText.setAlpha(1);
                const labelText = slot.data.baseName ? `${slot.data.baseName}${slot.data.isUpgraded ? ' +' : ''}` : '';
                slot.labelText.setText(labelText);
                slot.labelText.setTint(getBitmapTint(slot.data.isUpgraded ? INFO_UPGRADED_COLOR : INFO_SUBTEXT_COLOR));
                slot.background.setInteractive({ useHandCursor: true });
            } else {
                slot.data = null;
                slot.background.setFillStyle(DICE_SLOT_EMPTY_FILL_COLOR, 0.7);
                slot.background.setStrokeStyle(2, DICE_SLOT_STROKE_COLOR, 0.2);
                slot.emojiText.setText('');
                slot.emojiText.setAlpha(0.65);
                slot.labelText.setText('');
                slot.labelText.setTint(getBitmapTint(INFO_SUBTEXT_COLOR));
                slot.background.setInteractive({ useHandCursor: true });
            }
        });

        if (this.selectedDiceIndex !== null) {
            const selectedSlot = this.diceSlots[this.selectedDiceIndex];
            if (selectedSlot && selectedSlot.data) {
                this.showDiceInfo(selectedSlot.data.name, selectedSlot.data.description);
            } else {
                this.selectedDiceIndex = null;
                this.showDefaultDiceInfo();
            }
        }

        this.updateDiceDiscardButtonState();
    }

    refreshRelicSlots() {
        if (!Array.isArray(this.relicSlots) || this.relicSlots.length === 0) {
            this.updateRelicDiscardButtonState();
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
                    id: relic.id,
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

        if (this.selectedRelicIndex !== null) {
            const selectedSlot = this.relicSlots[this.selectedRelicIndex];
            if (selectedSlot && selectedSlot.data) {
                this.showRelicInfo(selectedSlot.data.name, selectedSlot.data.description);
            } else {
                this.selectedRelicIndex = null;
                this.showDefaultRelicInfo();
            }
        }

        this.updateRelicDiscardButtonState();
    }

    handleDiscardSelectedDie() {
        const index = this.selectedDiceIndex;
        if (typeof index !== 'number') {
            return;
        }

        const discardSucceeded = this.scene && typeof this.scene.discardCustomDieAtIndex === 'function'
            ? this.scene.discardCustomDieAtIndex(index)
            : false;

        if (discardSucceeded) {
            this.selectedDiceIndex = null;
            this.showDefaultDiceInfo();
            this.updateDiceHighlights();
        }

        this.updateDiceDiscardButtonState();
    }

    handleDiceSlotClick(index) {
        if (!Array.isArray(this.diceSlots) || !this.diceSlots[index]) {
            return;
        }

        const data = this.diceSlots[index].data;
        if (data) {
            if (this.selectedDiceIndex === index) {
                this.selectedDiceIndex = null;
                this.showDefaultDiceInfo();
            } else {
                this.selectedDiceIndex = index;
                const description = data.isUpgraded
                    ? data.description || DEFAULT_EMPTY_DIE_TEXT.description
                    : data.description || DEFAULT_EMPTY_DIE_TEXT.description;
                this.showDiceInfo(data.name || 'Die', description);
            }
        } else {
            this.selectedDiceIndex = null;
            this.showDefaultDiceInfo();
        }
        this.updateDiceHighlights();
        this.updateDiceDiscardButtonState();
    }

    handleDiscardSelectedRelic() {
        const index = this.selectedRelicIndex;
        if (typeof index !== 'number') {
            return;
        }

        const slot = Array.isArray(this.relicSlots) ? this.relicSlots[index] : null;
        const relicId = slot && slot.data ? slot.data.id : null;
        if (!relicId) {
            return;
        }

        const discardSucceeded = this.scene && typeof this.scene.discardRelicById === 'function'
            ? this.scene.discardRelicById(relicId)
            : false;

        if (discardSucceeded) {
            this.selectedRelicIndex = null;
            this.showDefaultRelicInfo();
            this.updateRelicHighlights();
        }

        this.updateRelicDiscardButtonState();
    }

    handleRelicSlotClick(index) {
        if (!Array.isArray(this.relicSlots) || !this.relicSlots[index]) {
            return;
        }

        const data = this.relicSlots[index].data;
        if (data) {
            if (this.selectedRelicIndex === index) {
                this.selectedRelicIndex = null;
                this.showDefaultRelicInfo();
            } else {
                this.selectedRelicIndex = index;
                this.showRelicInfo(data.name || 'Relic', data.description || DEFAULT_EMPTY_RELIC_TEXT.description);
            }
        } else {
            this.selectedRelicIndex = null;
            this.showDefaultRelicInfo();
        }
        this.updateRelicHighlights();
        this.updateRelicDiscardButtonState();
    }

    showDiceInfo(title, description) {
        if (this.diceInfoTitleText) {
            this.diceInfoTitleText.setText(title || 'Backpack');
        }
        if (this.diceInfoDescriptionText) {
            this.diceInfoDescriptionText.setText(description || '');
        }
    }

    showRelicInfo(title, description) {
        if (this.relicInfoTitleText) {
            this.relicInfoTitleText.setText(title || 'Backpack');
        }
        if (this.relicInfoDescriptionText) {
            this.relicInfoDescriptionText.setText(description || '');
        }
    }

    showDefaultDiceInfo() {
        this.showDiceInfo('Backpack', 'Select a die to learn more about it.');
    }

    showDefaultRelicInfo() {
        this.showRelicInfo('Backpack', 'Select a relic to learn more about it.');
    }

    updateDiceDiscardButtonState() {
        if (!this.diceDiscardButton) {
            return;
        }

        const { background, label } = this.diceDiscardButton;
        if (!background || !label) {
            return;
        }

        const hasSelection = typeof this.selectedDiceIndex === 'number';
        const slot = hasSelection && Array.isArray(this.diceSlots)
            ? this.diceSlots[this.selectedDiceIndex]
            : null;
        const canDiscard = !!(slot && slot.data && slot.data.id && slot.data.id !== 'standard');

        background.setVisible(canDiscard);
        label.setVisible(canDiscard);
        setRectangleButtonEnabled(background, canDiscard);
    }

    updateRelicDiscardButtonState() {
        if (!this.relicDiscardButton) {
            return;
        }

        const { background, label } = this.relicDiscardButton;
        if (!background || !label) {
            return;
        }

        const hasSelection = typeof this.selectedRelicIndex === 'number';
        const slot = hasSelection && Array.isArray(this.relicSlots)
            ? this.relicSlots[this.selectedRelicIndex]
            : null;
        const canDiscard = !!(slot && slot.data && slot.data.id);

        background.setVisible(canDiscard);
        label.setVisible(canDiscard);
        setRectangleButtonEnabled(background, canDiscard);
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
        if (this.isVisible && this.scene) {
            if (typeof this.scene.releaseModalInputLock === 'function') {
                this.scene.releaseModalInputLock();
            } else if (this.scene.input) {
                this.scene.input.setTopOnly(false);
            }
        }

        destroyModal(this.modal);
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.diceSlots = [];
        this.relicSlots = [];
        this.diceInfoTitleText = null;
        this.diceInfoDescriptionText = null;
        this.relicInfoTitleText = null;
        this.relicInfoDescriptionText = null;
        this.closeButton = null;
        this.isVisible = false;
        this.diceDiscardButton = null;
        this.relicDiscardButton = null;
    }
}
