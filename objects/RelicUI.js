import { CONSTANTS } from '../config.js';

export class RelicUIManager {
    constructor(scene) {
        this.scene = scene;
        this.relicVisuals = [];
        this.relicBackgrounds = new Map();
        this.relicInfoTitleText = null;
        this.relicInfoDescriptionText = null;
        this.selectedRelicId = null;
        this.relicTrayBorder = null;
        this.relicInfoBackground = null;
    }

    reset() {
        this.clearVisuals();
        this.destroyInfoTexts();
        this.destroyStaticElements();
        this.selectedRelicId = null;
    }

    createShelf() {
        this.clearVisuals();
        this.destroyInfoTexts();
        this.destroyStaticElements();

        const slotLimit = this.getSlotLimit();
        const offsetSpan = CONSTANTS.RELIC_ICON_SPACING * Math.max(0, slotLimit - 1);
        const infoCenterX = CONSTANTS.RIGHT_COLUMN_X - (offsetSpan / 2);
        const infoTitleY = CONSTANTS.RELIC_INFO_TITLE_Y;

        this.relicInfoBackground = this.scene.add.rectangle(
            infoCenterX,
            infoTitleY,
            CONSTANTS.RELIC_INFO_WRAP_WIDTH + 32,
            120,
            0x000000,
            0.45
        ).setOrigin(0.5, 0);
        this.relicInfoBackground.setStrokeStyle(2, 0xf1c40f, 0.25);

        this.relicInfoTitleText = this.scene.add.text(infoCenterX, infoTitleY + 20, '', {
            fontSize: '20px',
            color: '#f1c40f',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5, 0);

        this.relicInfoDescriptionText = this.scene.add.text(infoCenterX, infoTitleY + 45, '', {
            fontSize: '18px',
            color: '#f9e79f',
            wordWrap: { width: CONSTANTS.RELIC_INFO_WRAP_WIDTH },
            lineSpacing: 6,
            align: 'center'
        }).setOrigin(0.5, 0);

        const trayWidth = CONSTANTS.RELIC_ICON_SIZE + (CONSTANTS.RELIC_ICON_SPACING * Math.max(0, slotLimit - 1));
        const trayCenterX = CONSTANTS.RIGHT_COLUMN_X - (offsetSpan / 2);

        this.relicTrayBorder = this.scene.add.rectangle(
            trayCenterX,
            CONSTANTS.RELIC_TRAY_Y,
            trayWidth + 16,
            CONSTANTS.RELIC_ICON_SIZE + 24,
            0x000000,
            0.35
        ).setOrigin(0.5);
        this.relicTrayBorder.setStrokeStyle(2, 0xf1c40f, 0.4);

        this.setInfoText('', '');
        this.updateDisplay();
    }

    updateDisplay() {
        this.clearVisuals();

        if (!this.relicInfoTitleText || !this.relicInfoDescriptionText) {
            return;
        }

        const slotLimit = this.getSlotLimit();
        const ownedRelics = this.scene.relics.filter(relic => this.scene.ownedRelicIds.has(relic.id));
        const displayedRelics = ownedRelics.slice(0, slotLimit);

        const startX = CONSTANTS.RIGHT_COLUMN_X;
        const baseY = CONSTANTS.RELIC_TRAY_Y;
        const spacing = CONSTANTS.RELIC_ICON_SPACING;
        const iconSize = CONSTANTS.RELIC_ICON_SIZE;

        for (let index = 0; index < slotLimit; index += 1) {
            const x = startX - index * spacing;
            const hasRelic = index < displayedRelics.length;
            const iconBg = this.scene.add.rectangle(x, baseY, iconSize, iconSize, 0x1c1c1c, 0.85)
                .setStrokeStyle(2, 0xf1c40f, hasRelic ? 0.9 : 0.25);

            this.relicVisuals.push(iconBg);

            if (hasRelic) {
                const relic = displayedRelics[index];
                iconBg.setInteractive({ useHandCursor: true });

                const iconText = this.scene.add.text(x, baseY, relic.icon || '♦', {
                    fontSize: CONSTANTS.RELIC_ICON_FONT_SIZE,
                    padding: CONSTANTS.EMOJI_TEXT_PADDING
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });

                iconBg.on('pointerdown', () => this.showRelicDetails(relic));
                iconText.on('pointerdown', () => this.showRelicDetails(relic));

                this.relicVisuals.push(iconText);
                this.relicBackgrounds.set(relic.id, iconBg);
            }
        }

        const selectedRelic = displayedRelics.find(relic => relic.id === this.selectedRelicId);
        if (selectedRelic) {
            this.setInfoText(selectedRelic.name, selectedRelic.description);
        } else {
            this.selectedRelicId = null;
            this.setInfoText('', '');
        }

        this.updateRelicSelectionHighlight();
    }

    getSlotLimit() {
        if (this.scene && typeof this.scene.getRelicSlotLimit === 'function') {
            const limit = this.scene.getRelicSlotLimit();
            if (typeof limit === 'number' && limit > 0) {
                return Math.floor(limit);
            }
        }
        return CONSTANTS.RELIC_MAX_SLOTS;
    }

    showRelicDetails(relic) {
        if (!relic || !this.scene.ownedRelicIds.has(relic.id)) {
            this.selectedRelicId = null;
            this.setInfoText('', '');
            this.updateRelicSelectionHighlight();
            return;
        }

        if (this.selectedRelicId === relic.id) {
            this.selectedRelicId = null;
            this.setInfoText('', '');
        } else {
            this.selectedRelicId = relic.id;
            this.setInfoText(relic.name, relic.description);
        }

        this.updateRelicSelectionHighlight();
    }

    setVisible(visible) {
        const setVisibility = target => {
            if (target && typeof target.setVisible === 'function') {
                target.setVisible(visible);
            }
        };

        this.relicVisuals.forEach(setVisibility);
        setVisibility(this.relicTrayBorder);
        setVisibility(this.relicInfoTitleText);
        setVisibility(this.relicInfoDescriptionText);
        setVisibility(this.relicInfoBackground);
    }

    clearVisuals() {
        if (Array.isArray(this.relicVisuals)) {
            this.relicVisuals.forEach(obj => {
                if (obj && typeof obj.destroy === 'function') {
                    obj.destroy();
                }
            });
        }
        this.relicVisuals = [];
        if (this.relicBackgrounds && typeof this.relicBackgrounds.clear === 'function') {
            this.relicBackgrounds.clear();
        } else {
            this.relicBackgrounds = new Map();
        }
    }

    destroyInfoTexts() {
        if (this.relicInfoBackground) {
            this.relicInfoBackground.destroy();
            this.relicInfoBackground = null;
        }
        if (this.relicInfoTitleText) {
            this.relicInfoTitleText.destroy();
            this.relicInfoTitleText = null;
        }
        if (this.relicInfoDescriptionText) {
            this.relicInfoDescriptionText.destroy();
            this.relicInfoDescriptionText = null;
        }
    }

    destroyStaticElements() {
        if (this.relicTrayBorder) {
            this.relicTrayBorder.destroy();
            this.relicTrayBorder = null;
        }
    }

    setInfoText(title = '', description = '') {
        if (this.relicInfoTitleText) {
            this.relicInfoTitleText.setText(title || '');
        }
        if (this.relicInfoDescriptionText) {
            this.relicInfoDescriptionText.setText(description || '');
        }
    }

    updateRelicSelectionHighlight() {
        if (!this.relicBackgrounds || typeof this.relicBackgrounds.forEach !== 'function') {
            return;
        }

        this.relicBackgrounds.forEach((bg, relicId) => {
            if (!bg || typeof bg.setStrokeStyle !== 'function') {
                return;
            }
            const isSelected = relicId === this.selectedRelicId;
            bg.setStrokeStyle(2, isSelected ? 0xffffff : 0xf1c40f, isSelected ? 1 : 0.9);
        });
    }
}
