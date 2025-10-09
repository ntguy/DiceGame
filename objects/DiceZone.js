import { CONSTANTS } from '../config.js';
import { snapToGrid } from './Dice.js';
// import { highlightCombos } from '../systems/ComboSystem.js';

export function setupZones(scene) {
    const zoneWidth = CONSTANTS.DEFAULT_ZONE_WIDTH + 6;
    const zoneHeight = 100;
    const zoneY = 350;

    const visuals = [];

    // --- Defend zone ---
    const defendZoneX = 200;
    const attackZoneX = 600;

    const defendZone = scene.add.zone(defendZoneX, zoneY, zoneWidth, zoneHeight).setRectangleDropZone(zoneWidth, zoneHeight);
    const defendRect = scene.add.rectangle(defendZoneX, zoneY, zoneWidth, zoneHeight).setStrokeStyle(2, 0x3498db);
    const defendLabel = scene.add.text(defendZoneX, zoneY - zoneHeight/2 - 20, "DEFEND", { fontSize: "24px", color: "#3498db" }).setOrigin(0.5);
    visuals.push(defendRect, defendLabel);

    // --- Attack zone ---
    const attackZone = scene.add.zone(attackZoneX, zoneY, zoneWidth, zoneHeight).setRectangleDropZone(zoneWidth, zoneHeight);
    const attackRect = scene.add.rectangle(attackZoneX, zoneY, zoneWidth, zoneHeight).setStrokeStyle(2, 0xe74c3c);
    const attackLabel = scene.add.text(attackZoneX, zoneY - zoneHeight/2 - 20, "ATTACK", { fontSize: "24px", color: "#e74c3c" }).setOrigin(0.5);
    visuals.push(attackRect, attackLabel);

    scene.defendZone = defendZone;
    scene.attackZone = attackZone;
    scene.defendZoneCenter = { x: defendZoneX, y: zoneY };
    scene.attackZoneCenter = { x: attackZoneX, y: zoneY };

    // After drawing the defend zone rectangle
    scene.defendHighlight = scene.add.rectangle(200, zoneY, zoneWidth, zoneHeight, 0x3498db, 0.3).setOrigin(0.5);
    scene.defendHighlight.setVisible(false);

    // After drawing the attack zone rectangle
    scene.attackHighlight = scene.add.rectangle(600, zoneY, zoneWidth, zoneHeight, 0xe74c3c, 0.3).setOrigin(0.5);
    scene.attackHighlight.setVisible(false);

    scene.zoneVisuals = visuals;
}

export function removeFromZones(scene, die) {
    scene.defendDice = scene.defendDice.filter(d => d !== die);
    scene.attackDice = scene.attackDice.filter(d => d !== die);

    scene.defendSlots = scene.defendSlots.map(s => s === die ? null : s);
    scene.attackSlots = scene.attackSlots.map(s => s === die ? null : s);
}

export function snapIntoZone(die, slots, diceList, baseX, y, scene) {
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
    const zoneWidth = CONSTANTS.DEFAULT_ZONE_WIDTH; // should match setupZones
    const diceCount = slots.length; // 6 now
    const spacing = zoneWidth / diceCount; // space dice evenly
    die.x = baseX - zoneWidth/2 + spacing/2 + idx * spacing;
    die.y = y;
    die.setDepth(2);
}