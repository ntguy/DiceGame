import { getCustomDieDefinitionById } from '../dice/CustomDiceDefinitions.js';
import { getDieEmoji } from '../dice/CustomDiceLogic.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';

const PANEL_BACKGROUND_COLOR = 0x0e1927;
const PANEL_STROKE_COLOR = 0xf1c40f;
const BACKDROP_ALPHA = 0.68;
const DICE_SECTION_COLOR = 0x1a2e45;
const RELIC_SECTION_COLOR = 0x2a1f40;
const SECTION_BORDER_COLOR = 0xf1c40f;
const SECTION_BORDER_ALPHA = 0.28;
const SECTION_TITLE_COLOR = '#f9e79f';
const SLOT_BACKGROUND_COLOR = 0x0b1524;
const SLOT_BORDER_COLOR = 0x274053;
const SLOT_HIGHLIGHT_BORDER_COLOR = 0xf1c40f;
const RELIC_SLOT_BACKGROUND_COLOR = 0x1a1328;
const RELIC_SLOT_BORDER_COLOR = 0x3c2f5c;
const INFO_SECTION_COLOR = 0x101f30;
const INFO_SECTION_BORDER_COLOR = 0xf1c40f;
const INFO_TITLE_COLOR = '#f4d03f';
const INFO_BODY_COLOR = '#ecf0f1';
const CLOSE_BUTTON_FILL = 0x1b2631;
const CLOSE_BUTTON_STROKE = 0xf1c40f;

const PANEL_PADDING = 40;
const SECTION_GAP = 36;
const SLOT_COUNT = 6;
const DEFAULT_DIE_ICON = '🎲';
const INFO_DEFAULT_TITLE = 'Select an item';
const INFO_DEFAULT_DESCRIPTION = 'Tap a die or relic to see its name and effect.';

function formatDieName(definition, blueprint) {
    const baseName = definition?.name || 'Die';
    if (blueprint?.isUpgraded) {
        return `${baseName} (Upgraded)`;
    }
    return baseName;
}

function getDieDescription(definition, blueprint) {
    if (!definition) {
        return '';
    }
    if (blueprint?.isUpgraded) {
        return definition.upgradeDescription || definition.description || '';
    }
    return definition.description || '';
}

function createText(scene, x, y, text, style) {
    return scene.add.text(x, y, text, style).setOrigin(0.5, 0.5);
}

export class BackpackUI {
    constructor(scene) {
        this.scene = scene;
        this.backdrop = null;
        this.container = null;
        this.panel = null;
        this.diceSlots = [];
        this.relicSlots = [];
        this.infoTitleText = null;
        this.infoDescriptionText = null;
        this.closeButton = null;
        this.selectedSlot = null;
        this.isVisible = false;

        this.create();
        this.setVisible(false);
    }

    create() {
        const { width: sceneWidth, height: sceneHeight } = this.scene.scale;
        const panelWidth = sceneWidth - 80;
        const panelHeight = sceneHeight - 80;

        this.backdrop = this.scene.add.rectangle(
            sceneWidth / 2,
            sceneHeight / 2,
            sceneWidth,
            sceneHeight,
            0x000000,
            BACKDROP_ALPHA
        ).setDepth(140)
            .setInteractive({ useHandCursor: false });

        this.container = this.scene.add.container(sceneWidth / 2, sceneHeight / 2);
        this.container.setDepth(141);

        this.panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, PANEL_BACKGROUND_COLOR, 0.96)
            .setStrokeStyle(3, PANEL_STROKE_COLOR, 0.9);
        this.container.add(this.panel);

        const panelTop = -panelHeight / 2 + PANEL_PADDING;
        const panelBottom = panelHeight / 2 - PANEL_PADDING;
        const availableHeight = panelBottom - panelTop;
        const leftRightGap = SECTION_GAP;
        const rightWidth = Math.max(300, Math.round(panelWidth / 3));
        const leftWidth = panelWidth - rightWidth - leftRightGap;
        const leftCenterX = -panelWidth / 2 + PANEL_PADDING + leftWidth / 2;
        const rightCenterX = leftCenterX + leftWidth / 2 + leftRightGap + rightWidth / 2;

        const sectionHeight = (availableHeight - SECTION_GAP) / 2;
        const diceCenterY = panelTop + sectionHeight / 2;
        const relicCenterY = diceCenterY + sectionHeight / 2 + SECTION_GAP + sectionHeight / 2;

        const diceSection = this.scene.add.rectangle(
            leftCenterX,
            diceCenterY,
            leftWidth,
            sectionHeight,
            DICE_SECTION_COLOR,
            0.92
        ).setStrokeStyle(2, SECTION_BORDER_COLOR, SECTION_BORDER_ALPHA);
        const relicSection = this.scene.add.rectangle(
            leftCenterX,
            relicCenterY,
            leftWidth,
            sectionHeight,
            RELIC_SECTION_COLOR,
            0.92
        ).setStrokeStyle(2, SECTION_BORDER_COLOR, SECTION_BORDER_ALPHA);

        this.container.add(diceSection);
        this.container.add(relicSection);

        const diceTitle = createText(this.scene, leftCenterX, diceSection.y - diceSection.height / 2 + 24, 'Dice', {
            fontSize: '26px',
            color: SECTION_TITLE_COLOR,
            fontStyle: 'bold'
        });
        const relicTitle = createText(this.scene, leftCenterX, relicSection.y - relicSection.height / 2 + 24, 'Relics', {
            fontSize: '26px',
            color: SECTION_TITLE_COLOR,
            fontStyle: 'bold'
        });

        this.container.add(diceTitle);
        this.container.add(relicTitle);

        const diceRowY = diceSection.y + 10;
        const relicRowY = relicSection.y + 10;
        const slotSpacing = leftWidth / SLOT_COUNT;
        const diceSlotSize = Math.min(96, sectionHeight - 60);
        const relicSlotRadius = Math.min(44, (sectionHeight - 60) / 2);

        for (let index = 0; index < SLOT_COUNT; index += 1) {
            const slotX = leftCenterX - (leftWidth / 2) + slotSpacing * (index + 0.5);
        const diceSlot = this.createDieSlot(slotX, diceRowY, diceSlotSize);
            this.diceSlots.push(diceSlot);
            this.container.add(diceSlot.background);
            this.container.add(diceSlot.icon);

            const relicSlot = this.createRelicSlot(slotX, relicRowY, relicSlotRadius);
            this.relicSlots.push(relicSlot);
            this.container.add(relicSlot.background);
            this.container.add(relicSlot.icon);
        }

        const infoSection = this.scene.add.rectangle(
            rightCenterX,
            (panelTop + panelBottom) / 2,
            rightWidth,
            availableHeight,
            INFO_SECTION_COLOR,
            0.94
        ).setStrokeStyle(2, INFO_SECTION_BORDER_COLOR, 0.42);

        this.container.add(infoSection);

        const infoTitleY = infoSection.y - infoSection.height / 2 + 36;
        this.infoTitleText = this.scene.add.text(rightCenterX, infoTitleY, INFO_DEFAULT_TITLE, {
            fontSize: '28px',
            color: INFO_TITLE_COLOR,
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: rightWidth - 48 }
        }).setOrigin(0.5, 0);
        this.container.add(this.infoTitleText);

        const infoBodyY = this.infoTitleText.y + 60;
        this.infoDescriptionText = this.scene.add.text(rightCenterX, infoBodyY, INFO_DEFAULT_DESCRIPTION, {
            fontSize: '20px',
            color: INFO_BODY_COLOR,
            wordWrap: { width: rightWidth - 48 },
            lineSpacing: 6,
            align: 'center'
        }).setOrigin(0.5, 0);
        this.container.add(this.infoDescriptionText);

        const buttonWidth = rightWidth - 60;
        const buttonHeight = 56;
        const buttonY = infoSection.y + infoSection.height / 2 - buttonHeight;

        const closeBackground = this.scene.add.rectangle(
            rightCenterX,
            buttonY,
            buttonWidth,
            buttonHeight,
            CLOSE_BUTTON_FILL,
            0.92
        ).setStrokeStyle(2, CLOSE_BUTTON_STROKE, 0.8)
            .setInteractive({ useHandCursor: true });

        const closeText = this.scene.add.text(rightCenterX, buttonY, 'Close', {
            fontSize: '22px',
            color: '#fdfefe',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(closeBackground, {
            baseColor: CLOSE_BUTTON_FILL,
            baseAlpha: 0.92,
            hoverBlend: 0.18,
            pressBlend: 0.3,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });

        closeBackground.on('pointerup', () => {
            this.scene.closeBackpack();
        });

        this.container.add(closeBackground);
        this.container.add(closeText);
        this.closeButton = { background: closeBackground, label: closeText };

        if (this.backdrop) {
            this.backdrop.on('pointerup', () => {
                this.scene.closeBackpack();
            });
        }
    }

    createDieSlot(x, y, size) {
        const background = this.scene.add.rectangle(
            x,
            y,
            size,
            size,
            SLOT_BACKGROUND_COLOR,
            0.9
        ).setStrokeStyle(2, SLOT_BORDER_COLOR, 0.6);
        background.disableInteractive();

        const icon = this.scene.add.text(x, y, '', {
            fontSize: `${Math.max(28, Math.round(size * 0.36))}px`,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        return {
            type: 'die',
            background,
            icon,
            data: null
        };
    }

    createRelicSlot(x, y, radius) {
        const background = this.scene.add.circle(
            x,
            y,
            radius,
            RELIC_SLOT_BACKGROUND_COLOR,
            0.92
        ).setStrokeStyle(2, RELIC_SLOT_BORDER_COLOR, 0.6);
        background.disableInteractive();

        const icon = this.scene.add.text(x, y, '', {
            fontSize: `${Math.max(26, Math.round(radius * 1.2))}px`,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        return {
            type: 'relic',
            background,
            icon,
            data: null
        };
    }

    attachSlotHandlers(background, icon, item, type) {
        const slotIndex = type === 'die'
            ? this.diceSlots.findIndex(slot => slot.background === background)
            : this.relicSlots.findIndex(slot => slot.background === background);

        background.removeAllListeners('pointerup');
        if (icon && typeof icon.removeAllListeners === 'function') {
            icon.removeAllListeners('pointerup');
        }

        if (item) {
            const handler = () => {
                const slotCollection = type === 'die' ? this.diceSlots : this.relicSlots;
                const slot = slotCollection[slotIndex];
                if (!slot) {
                    return;
                }
                this.handleSlotSelection(slot);
            };

            background.setInteractive({ useHandCursor: true });
            background.on('pointerup', handler);
            if (icon && typeof icon.setInteractive === 'function') {
                icon.setInteractive({ useHandCursor: true });
                icon.on('pointerup', handler);
            }
        } else {
            background.disableInteractive();
            if (icon && typeof icon.disableInteractive === 'function') {
                icon.disableInteractive();
            }
            this.setSlotHighlight(background, false, type);
        }
    }

    handleSlotSelection(slot) {
        if (!slot || !slot.data) {
            this.selectedSlot = null;
            this.showInfo(null);
            this.updateHighlights();
            return;
        }

        if (this.selectedSlot === slot) {
            this.selectedSlot = null;
            this.showInfo(null);
        } else {
            this.selectedSlot = slot;
            this.showInfo(slot.data);
        }

        this.updateHighlights();
    }

    updateHighlights() {
        this.diceSlots.forEach(slot => {
            this.setSlotHighlight(slot.background, this.selectedSlot === slot, 'die');
        });
        this.relicSlots.forEach(slot => {
            this.setSlotHighlight(slot.background, this.selectedSlot === slot, 'relic');
        });
    }

    setSlotHighlight(background, isSelected, type) {
        if (!background) {
            return;
        }
        if (isSelected) {
            background.setStrokeStyle(3, SLOT_HIGHLIGHT_BORDER_COLOR, 0.95);
            return;
        }

        if (type === 'die') {
            background.setStrokeStyle(2, SLOT_BORDER_COLOR, 0.6);
        } else {
            background.setStrokeStyle(2, RELIC_SLOT_BORDER_COLOR, 0.6);
        }
    }

    showInfo(data) {
        if (!data) {
            this.infoTitleText?.setText(INFO_DEFAULT_TITLE);
            this.infoDescriptionText?.setText(INFO_DEFAULT_DESCRIPTION);
            return;
        }

        if (data.type === 'die') {
            this.infoTitleText?.setText(data.name || 'Die');
            const description = data.description || '';
            this.infoDescriptionText?.setText(description || '');
        } else if (data.type === 'relic') {
            this.infoTitleText?.setText(data.name || 'Relic');
            const description = data.description || '';
            this.infoDescriptionText?.setText(description || '');
        }
    }

    refresh() {
        this.populateDice();
        this.populateRelics();
        this.selectedSlot = null;
        this.showInfo(null);
        this.updateHighlights();
    }

    populateDice() {
        const blueprints = typeof this.scene.getActiveDiceBlueprints === 'function'
            ? this.scene.getActiveDiceBlueprints()
            : [];

        this.diceSlots.forEach((slot, index) => {
            const blueprint = blueprints[index];
            const definition = blueprint ? getCustomDieDefinitionById(blueprint.id) : null;
            const emoji = blueprint
                ? (getDieEmoji(blueprint.id) || DEFAULT_DIE_ICON)
                : '';
            const name = blueprint ? formatDieName(definition, blueprint) : 'Empty Slot';
            const description = blueprint
                ? getDieDescription(definition, blueprint)
                : 'No die assigned to this slot yet.';

            slot.data = blueprint
                ? {
                    type: 'die',
                    name,
                    description,
                    emoji
                }
                : null;

            slot.icon.setText(slot.data ? slot.data.emoji : DEFAULT_DIE_ICON);
            slot.icon.setAlpha(slot.data ? 1 : 0.25);
            slot.icon.setVisible(true);
            slot.background.setFillStyle(SLOT_BACKGROUND_COLOR, slot.data ? 0.9 : 0.4);
            this.attachSlotHandlers(slot.background, slot.icon, slot.data, 'die');
        });
    }

    populateRelics() {
        const ownedRelics = Array.isArray(this.scene.relics)
            ? this.scene.relics.filter(relic => this.scene.ownedRelicIds?.has(relic.id))
            : [];

        this.relicSlots.forEach((slot, index) => {
            const relic = ownedRelics[index] || null;
            if (relic) {
                slot.data = {
                    type: 'relic',
                    name: relic.name || 'Relic',
                    description: relic.description || '',
                    emoji: relic.icon || '♦'
                };
                slot.icon.setText(slot.data.emoji);
                slot.icon.setAlpha(1);
                slot.icon.setVisible(true);
                slot.background.setFillStyle(RELIC_SLOT_BACKGROUND_COLOR, 0.92);
            } else {
                slot.data = null;
                slot.icon.setText('♦');
                slot.icon.setAlpha(0.25);
                slot.icon.setVisible(true);
                slot.background.setFillStyle(RELIC_SLOT_BACKGROUND_COLOR, 0.35);
            }

            this.attachSlotHandlers(slot.background, slot.icon, slot.data, 'relic');
        });
    }

    setVisible(visible) {
        this.isVisible = !!visible;
        const targets = [this.backdrop, this.container];
        targets.forEach(target => {
            if (target && typeof target.setVisible === 'function') {
                target.setVisible(this.isVisible);
            }
            if (target && typeof target.setActive === 'function') {
                target.setActive(this.isVisible);
            }
        });
    }

    open() {
        this.refresh();
        this.setVisible(true);
    }

    close() {
        this.setVisible(false);
        this.selectedSlot = null;
    }

    destroy() {
        if (this.backdrop) {
            this.backdrop.destroy();
            this.backdrop = null;
        }

        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        this.panel = null;
        this.diceSlots = [];
        this.relicSlots = [];
        this.infoTitleText = null;
        this.infoDescriptionText = null;
        this.closeButton = null;
        this.selectedSlot = null;
    }
}
