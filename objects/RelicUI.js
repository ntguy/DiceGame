import { CONSTANTS } from '../config.js';

export class RelicUIManager {
    constructor(scene) {
        this.scene = scene;
        this.relicVisuals = [];
        this.relicBackgrounds = new Map();
        this.relicInfoTitleText = null;
        this.relicInfoDescriptionText = null;
        this.selectedRelicId = null;
    }

    reset() {
        this.clearVisuals();
        this.destroyInfoTexts();
        this.selectedRelicId = null;
    }

    createShelf() {
        this.clearVisuals();
        this.destroyInfoTexts();

        this.relicInfoTitleText = this.scene.add.text(CONSTANTS.RIGHT_COLUMN_X, CONSTANTS.RELIC_INFO_TITLE_Y, '', {
            fontSize: '24px',
            color: '#f1c40f',
            fontStyle: 'bold'
        }).setOrigin(1, 0);

        this.relicInfoDescriptionText = this.scene.add.text(CONSTANTS.RIGHT_COLUMN_X, CONSTANTS.RELIC_INFO_TITLE_Y + 32, '', {
            fontSize: '18px',
            color: '#f9e79f',
            wordWrap: { width: CONSTANTS.RELIC_INFO_WRAP_WIDTH },
            lineSpacing: 6
        }).setOrigin(1, 0);

        this.setInfoText('', '');
        this.updateDisplay();
    }

    updateDisplay() {
        this.clearVisuals();

        if (!this.relicInfoTitleText || !this.relicInfoDescriptionText) {
            return;
        }

        const ownedRelics = this.scene.relics.filter(relic => this.scene.ownedRelicIds.has(relic.id));

        const startX = CONSTANTS.RIGHT_COLUMN_X;
        const baseY = CONSTANTS.RELIC_TRAY_Y;
        const spacing = CONSTANTS.RELIC_ICON_SPACING;
        const iconSize = CONSTANTS.RELIC_ICON_SIZE;

        ownedRelics.forEach((relic, index) => {
            const x = startX - index * spacing;
            const iconBg = this.scene.add.rectangle(x, baseY, iconSize, iconSize, 0x1c1c1c, 0.85)
                .setStrokeStyle(2, 0xf1c40f, 0.9)
                .setInteractive({ useHandCursor: true });
            const iconText = this.scene.add.text(x, baseY, relic.icon || '♦', {
                fontSize: CONSTANTS.RELIC_ICON_FONT_SIZE
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            iconBg.on('pointerdown', () => this.showRelicDetails(relic));
            iconText.on('pointerdown', () => this.showRelicDetails(relic));

            this.relicVisuals.push(iconBg, iconText);
            this.relicBackgrounds.set(relic.id, iconBg);
        });

        const selectedRelic = ownedRelics.find(relic => relic.id === this.selectedRelicId);
        if (selectedRelic) {
            this.setInfoText(selectedRelic.name, selectedRelic.description);
        } else {
            this.selectedRelicId = null;
            this.setInfoText('', '');
        }

        this.updateRelicSelectionHighlight();
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
        setVisibility(this.relicInfoTitleText);
        setVisibility(this.relicInfoDescriptionText);
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
        if (this.relicInfoTitleText) {
            this.relicInfoTitleText.destroy();
            this.relicInfoTitleText = null;
        }
        if (this.relicInfoDescriptionText) {
            this.relicInfoDescriptionText.destroy();
            this.relicInfoDescriptionText = null;
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
