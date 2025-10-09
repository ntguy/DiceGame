import { CONSTANTS } from '../config.js';

function ensureTextDestroyed(text) {
    if (text && typeof text.destroy === 'function') {
        text.destroy();
    }
}

export function clearRelicVisuals(scene) {
    if (scene.relicVisuals && Array.isArray(scene.relicVisuals)) {
        scene.relicVisuals.forEach(obj => {
            if (obj && typeof obj.destroy === 'function') {
                obj.destroy();
            }
        });
    }
    scene.relicVisuals = [];
    if (scene.relicBackgrounds && typeof scene.relicBackgrounds.clear === 'function') {
        scene.relicBackgrounds.clear();
    }
}

export function setRelicInfoText(scene, title = '', description = '') {
    if (scene.relicInfoTitleText) {
        scene.relicInfoTitleText.setText(title || '');
    }
    if (scene.relicInfoDescriptionText) {
        scene.relicInfoDescriptionText.setText(description || '');
    }
}

export function updateRelicSelectionHighlight(scene) {
    if (!scene.relicBackgrounds || typeof scene.relicBackgrounds.forEach !== 'function') {
        return;
    }

    scene.relicBackgrounds.forEach((bg, relicId) => {
        if (!bg || typeof bg.setStrokeStyle !== 'function') {
            return;
        }
        const isSelected = relicId === scene.selectedRelicId;
        bg.setStrokeStyle(2, isSelected ? 0xffffff : 0xf1c40f, isSelected ? 1 : 0.9);
    });
}

export function showRelicDetails(scene, relic) {
    if (!relic || !scene.ownedRelicIds.has(relic.id)) {
        scene.selectedRelicId = null;
        setRelicInfoText(scene, '', '');
        updateRelicSelectionHighlight(scene);
        return;
    }

    if (scene.selectedRelicId === relic.id) {
        scene.selectedRelicId = null;
        setRelicInfoText(scene, '', '');
    } else {
        scene.selectedRelicId = relic.id;
        setRelicInfoText(scene, relic.name, relic.description);
    }
    updateRelicSelectionHighlight(scene);
}

export function updateRelicDisplay(scene) {
    clearRelicVisuals(scene);

    if (!scene.relicInfoTitleText || !scene.relicInfoDescriptionText) {
        return;
    }

    const ownedRelics = scene.relics.filter(relic => scene.ownedRelicIds.has(relic.id));

    const startX = CONSTANTS.RIGHT_COLUMN_X;
    const baseY = CONSTANTS.RELIC_TRAY_Y;
    const spacing = CONSTANTS.RELIC_ICON_SPACING;
    const iconSize = CONSTANTS.RELIC_ICON_SIZE;

    ownedRelics.forEach((relic, index) => {
        const x = startX - index * spacing;
        const iconBg = scene.add.rectangle(x, baseY, iconSize, iconSize, 0x1c1c1c, 0.85)
            .setStrokeStyle(2, 0xf1c40f, 0.9)
            .setInteractive({ useHandCursor: true });
        const iconText = scene.add.text(x, baseY, relic.icon || '♦', {
            fontSize: CONSTANTS.RELIC_ICON_FONT_SIZE
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        iconBg.on('pointerdown', () => showRelicDetails(scene, relic));
        iconText.on('pointerdown', () => showRelicDetails(scene, relic));

        scene.relicVisuals.push(iconBg, iconText);
        scene.relicBackgrounds.set(relic.id, iconBg);
    });

    const selectedRelic = ownedRelics.find(relic => relic.id === scene.selectedRelicId);
    if (selectedRelic) {
        setRelicInfoText(scene, selectedRelic.name, selectedRelic.description);
    } else {
        scene.selectedRelicId = null;
        setRelicInfoText(scene, '', '');
    }

    updateRelicSelectionHighlight(scene);
}

export function createRelicShelf(scene) {
    clearRelicVisuals(scene);

    ensureTextDestroyed(scene.relicInfoTitleText);
    scene.relicInfoTitleText = null;

    ensureTextDestroyed(scene.relicInfoDescriptionText);
    scene.relicInfoDescriptionText = null;

    scene.relicInfoTitleText = scene.add.text(CONSTANTS.RIGHT_COLUMN_X, CONSTANTS.RELIC_INFO_TITLE_Y, '', {
        fontSize: '24px',
        color: '#f1c40f',
        fontStyle: 'bold'
    }).setOrigin(1, 0);

    scene.relicInfoDescriptionText = scene.add.text(CONSTANTS.RIGHT_COLUMN_X, CONSTANTS.RELIC_INFO_TITLE_Y + 32, '', {
        fontSize: '18px',
        color: '#f9e79f',
        wordWrap: { width: CONSTANTS.RELIC_INFO_WRAP_WIDTH },
        lineSpacing: 6
    }).setOrigin(1, 0);

    setRelicInfoText(scene, '', '');
    updateRelicDisplay(scene);
}
