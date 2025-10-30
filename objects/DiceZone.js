import { CONSTANTS } from '../config.js';
import { isZoneAllowedForDie } from '../dice/CustomDiceLogic.js';
import { snapToGrid } from './Dice.js';
import { callSceneMethod } from '../utils/SceneHelpers.js';

const ZONE_BACKGROUND_TILE_SCALE = 2;

export const ZONE_LABEL_OFFSET = 20;
export const ZONE_LABEL_FONT_SIZE = 24;
export const ZONE_AREA_PADDING_X = 20;
export const ZONE_AREA_PADDING_TOP = 40;
export const ZONE_AREA_PADDING_BOTTOM = 16;
const ZONE_AREA_BACKGROUND_ALPHA = 0.6;

export function setupZones(scene) {
    const zoneWidth = scene && typeof scene.getZoneWidth === 'function'
        ? scene.getZoneWidth({ includePadding: true })
        : CONSTANTS.DEFAULT_ZONE_WIDTH + 6;
    const zoneHeight = scene && typeof scene.getZoneHeight === 'function'
        ? scene.getZoneHeight()
        : 100;
    const zoneY = 350;
    const backgroundTextureKey = scene && typeof scene.getZoneBackgroundTextureKey === 'function'
        ? scene.getZoneBackgroundTextureKey()
        : 'path_background';

    const visuals = [];

    // --- Defend zone ---
    const defendZoneX = 200;
    const attackZoneX = 600;

    const zoneAreaCenterX = (defendZoneX + attackZoneX) / 2;
    const zoneAreaWidth = Math.abs(attackZoneX - defendZoneX) + zoneWidth + ZONE_AREA_PADDING_X * 2;
    const zoneTop = zoneY - zoneHeight / 2;
    const zoneBottom = zoneY + zoneHeight / 2;
    const zoneAreaTop = zoneTop - ZONE_LABEL_OFFSET - (ZONE_LABEL_FONT_SIZE / 2) - ZONE_AREA_PADDING_TOP;
    const zoneAreaBottom = zoneBottom + ZONE_AREA_PADDING_BOTTOM;
    const zoneAreaHeight = zoneAreaBottom - zoneAreaTop;
    const zoneAreaCenterY = zoneAreaTop + zoneAreaHeight / 2;

    const zoneAreaBackground = scene.add.rectangle(
        zoneAreaCenterX,
        zoneAreaCenterY,
        zoneAreaWidth,
        zoneAreaHeight,
        0x000000,
        ZONE_AREA_BACKGROUND_ALPHA
    ).setOrigin(0.5);
    visuals.push(zoneAreaBackground);

    const defendZone = scene.add.zone(defendZoneX, zoneY, zoneWidth, zoneHeight).setRectangleDropZone(zoneWidth, zoneHeight);
    const defendBackground = scene.add.tileSprite(defendZoneX, zoneY, zoneWidth, zoneHeight, backgroundTextureKey)
        .setOrigin(0.5)
        .setTileScale(ZONE_BACKGROUND_TILE_SCALE, ZONE_BACKGROUND_TILE_SCALE);
    const defendRect = scene.add.rectangle(defendZoneX, zoneY, zoneWidth, zoneHeight).setStrokeStyle(2, 0x3498db);
    const defendLabel = scene.add.text(
        defendZoneX,
        zoneY - zoneHeight / 2 - ZONE_LABEL_OFFSET,
        "DEFEND",
        { fontSize: `${ZONE_LABEL_FONT_SIZE}px`, color: "#3498db" }
    ).setOrigin(0.5);
    visuals.push(defendBackground, defendRect, defendLabel);

    // --- Attack zone ---
    const attackZone = scene.add.zone(attackZoneX, zoneY, zoneWidth, zoneHeight).setRectangleDropZone(zoneWidth, zoneHeight);
    const attackBackground = scene.add.tileSprite(attackZoneX, zoneY, zoneWidth, zoneHeight, backgroundTextureKey)
        .setOrigin(0.5)
        .setTileScale(ZONE_BACKGROUND_TILE_SCALE, ZONE_BACKGROUND_TILE_SCALE);
    const attackRect = scene.add.rectangle(attackZoneX, zoneY, zoneWidth, zoneHeight).setStrokeStyle(2, 0xe74c3c);
    const attackLabel = scene.add.text(
        attackZoneX,
        zoneY - zoneHeight / 2 - ZONE_LABEL_OFFSET,
        "ATTACK",
        { fontSize: `${ZONE_LABEL_FONT_SIZE}px`, color: "#e74c3c" }
    ).setOrigin(0.5);
    visuals.push(attackBackground, attackRect, attackLabel);

    scene.defendZone = defendZone;
    scene.attackZone = attackZone;
    scene.defendZoneBackground = defendBackground;
    scene.attackZoneBackground = attackBackground;
    scene.defendZoneRect = defendRect;
    scene.attackZoneRect = attackRect;
    scene.defendZoneLabel = defendLabel;
    scene.attackZoneLabel = attackLabel;
    scene.zoneAreaBackground = zoneAreaBackground;
    scene.defendZoneCenter = { x: defendZoneX, y: zoneY };
    scene.attackZoneCenter = { x: attackZoneX, y: zoneY };

    // After drawing the defend zone rectangle
    scene.defendHighlight = scene.add.rectangle(200, zoneY, zoneWidth, zoneHeight, 0x3498db, 0.3).setOrigin(0.5);
    scene.defendHighlight.setVisible(false);

    // After drawing the attack zone rectangle
    scene.attackHighlight = scene.add.rectangle(600, zoneY, zoneWidth, zoneHeight, 0xe74c3c, 0.3).setOrigin(0.5);
    scene.attackHighlight.setVisible(false);

    if (typeof scene.updateZoneVisualLayout === 'function') {
        scene.updateZoneVisualLayout();
    }

    scene.zoneVisuals = visuals;
}

export function removeFromZones(scene, die) {
    scene.defendDice = scene.defendDice.filter(d => d !== die);
    scene.attackDice = scene.attackDice.filter(d => d !== die);

    scene.defendSlots = scene.defendSlots.map(s => s === die ? null : s);
    scene.attackSlots = scene.attackSlots.map(s => s === die ? null : s);

    if (die) {
        die.currentZone = null;
        if (typeof die.updateFaceValueHighlight === 'function') {
            die.updateFaceValueHighlight();
        }
    }

    callSceneMethod(scene, 'updateZonePreviewText');
}


export function snapIntoZone(die, slots, diceList, baseX, y, scene) {
    const zoneType = diceList === scene.defendDice ? 'defend' : 'attack';
    if (!isZoneAllowedForDie(die, zoneType)) {
        snapToGrid(die, scene.dice, scene);
        return;
    }

    const idx = slots.findIndex(s => s === null);
    if (idx === -1) {
        snapToGrid(die, scene.dice, scene);
        return;
    }

    slots[idx] = die;         // mark slot as occupied
    diceList.push(die);       // add to zone list

    // Remove from main dice array
    const diceIndex = scene.dice.indexOf(die);
    if (diceIndex !== -1) {
        scene.dice.splice(diceIndex, 1);
    }

    // dynamic spacing so all dice fit evenly in the zone
    const zoneWidth = scene && typeof scene.getZoneWidth === 'function'
        ? scene.getZoneWidth()
        : CONSTANTS.DEFAULT_ZONE_WIDTH; // should match setupZones
    const diceCount = Math.max(1, slots.length);
    const spacing = zoneWidth / diceCount; // space dice evenly
    die.x = baseX - zoneWidth/2 + spacing/2 + idx * spacing;
    die.y = y;
    die.setDepth(2);

    die.currentZone = zoneType;
    if (typeof die.updateFaceValueHighlight === 'function') {
        die.updateFaceValueHighlight();
    }

    callSceneMethod(scene, 'updateZonePreviewText');
    callSceneMethod(scene, 'arrangeHandDice', { animate: true });
}
