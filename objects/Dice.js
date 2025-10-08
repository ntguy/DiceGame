import { CONSTANTS } from '../config.js';
import { removeFromZones, snapIntoZone } from './DiceZone.js';
import { highlightCombos } from '../systems/ComboSystem.js';

export function createDie(scene, slotIndex) {
    const x = CONSTANTS.SLOT_START_X + slotIndex * CONSTANTS.SLOT_SPACING;
    const y = CONSTANTS.GRID_Y;
    const container = scene.add.container(x, y);

    const bg = scene.add.rectangle(0, 0, CONSTANTS.DIE_SIZE, CONSTANTS.DIE_SIZE, 0x444444)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, 0.35);
    container.add(bg);
    container.bg = bg;

    const lockOverlay = scene.add.rectangle(0, 0, CONSTANTS.DIE_SIZE + 12, CONSTANTS.DIE_SIZE + 12, 0x8e44ad, 0.35)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0xf1c40f, 0.8)
        .setVisible(false)
        .setAngle(8);
    container.add(lockOverlay);
    container.lockOverlay = lockOverlay;

    const lockIcon = scene.add.text(0, 0, '⛓', {
        fontSize: '28px',
        color: '#f9e79f'
    }).setOrigin(0.5).setVisible(false);
    container.add(lockIcon);
    container.lockIcon = lockIcon;

    container.value = Phaser.Math.Between(1, 6);
    container.selected = false;
    container.slotIndex = slotIndex;
    container.pips = [];
    container.isLocked = false;

    // Add die methods
    container.roll = function() {
        drawDiePips(scene, this, Phaser.Math.Between(1, 6));
    };

    container.setLocked = function(isLocked) {
        this.isLocked = isLocked;
        if (isLocked) {
            this.selected = false;
        }
        this.updateVisualState();
    };

    container.updateVisualState = function() {
        if (this.isLocked) {
            this.bg.fillColor = 0x5b2c6f;
            this.lockOverlay.setVisible(true);
            this.lockIcon.setVisible(true);
        } else {
            this.lockOverlay.setVisible(false);
            this.lockIcon.setVisible(false);
            this.bg.fillColor = this.selected ? 0x2ecc71 : 0x444444;
        }
    };

    drawDiePips(scene, container, container.value);
    container.updateVisualState();

    container.setSize(CONSTANTS.DIE_SIZE, CONSTANTS.DIE_SIZE);
    container.setInteractive();
    scene.input.setDraggable(container);

    // --- Click to toggle selection ---
    container.on("pointerup", pointer => {
        if (container.isLocked) {
            return;
        }

        if (Math.abs(pointer.downX - pointer.x) < 5 && Math.abs(pointer.downY - pointer.y) < 5) {
            container.selected = !container.selected;
            container.updateVisualState();
            scene.updateRollButtonState();
        }
    });

    // --- Drag movement ---
    container.on("drag", (pointer, dragX, dragY) => {
        container.x = dragX;
        container.y = dragY;

        // --- Zone highlights ---
        scene.defendHighlight.setVisible(dragY < CONSTANTS.GRID_Y - 50 && dragX < 400 && scene.defendSlots.includes(null));
        scene.attackHighlight.setVisible(dragY < CONSTANTS.GRID_Y - 50 && dragX > 400 && scene.attackSlots.includes(null));
    });

    // --- Drag end ---
    container.on("dragend", () => {
        scene.defendHighlight.setVisible(false);
        scene.attackHighlight.setVisible(false);

        // Remove from any zone first
        removeFromZones(scene, container);

        const zoneY = 350;

        if (container.y < CONSTANTS.GRID_Y - 50) {
            // Dropped in a zone
            if (container.x < 400) {
                snapIntoZone(container, scene.defendSlots, scene.defendDice, 200, zoneY, scene);
                highlightCombos(scene, scene.defendDice);
            } else {
                snapIntoZone(container, scene.attackSlots, scene.attackDice, 600, zoneY, scene);
                highlightCombos(scene, scene.attackDice);
            }
        } else {
            // Dropped back into main row
            const fromZone = snapToGrid(container, scene.dice, scene);
            
            // Only update the zone it came from
            if (fromZone === 'defend') {
                highlightCombos(scene, scene.defendDice);
            } else if (fromZone === 'attack') {
                highlightCombos(scene, scene.attackDice);
            }
        }
    });

    return container;
}

function drawDiePips(scene, container, value) {
    container.value = value;
    container.pips.forEach(p => p.destroy());
    container.pips = [];

    const positions = {
        1: [[0, 0]],
        2: [[-15,-15],[15,15]],
        3: [[-15,-15],[0,0],[15,15]],
        4: [[-15,-15],[15,-15],[-15,15],[15,15]],
        5: [[-15,-15],[15,-15],[0,0],[-15,15],[15,15]],
        6: [[-15,-15],[15,-15],[-15,0],[15,0],[-15,15],[15,15]]
    };

    positions[value].forEach(([dx, dy]) => {
        const pip = scene.add.circle(dx, dy, 6, 0xffffff);
        container.add(pip);
        container.pips.push(pip);
    });

    if (container.lockIcon) {
        container.bringToTop(container.lockIcon);
    }
    if (container.lockOverlay) {
        container.bringToTop(container.lockOverlay);
        container.sendToBack(container.bg);
        container.bringToTop(container.lockIcon);
    }
}

export function snapToGrid(die, diceArray, scene) {
    // Check if die is actually in a zone before removing it
    const inDefendZone = scene.defendDice.includes(die);
    const inAttackZone = scene.attackDice.includes(die);
    
    // Only remove from zones if it's actually in a zone
    if (inDefendZone || inAttackZone) {
        removeFromZones(scene, die);
    }

    // Calculate which slot the die should go into based on its position
    // Check if die is already in hand or coming from zone
    const currentIndex = diceArray.indexOf(die);
    const effectiveLength = currentIndex === -1 ? diceArray.length : diceArray.length - 1;
    
    // Calculate target slot with proper bounds
    const targetSlot = Phaser.Math.Clamp(
        Math.round((die.x - CONSTANTS.SLOT_START_X) / CONSTANTS.SLOT_SPACING), 
        0, 
        effectiveLength
    );
    
    // Update array
    if (currentIndex !== -1) {
        diceArray.splice(currentIndex, 1);
    }
    diceArray.splice(targetSlot, 0, die);

    // Update positions
    diceArray.forEach((d, i) => {
        d.slotIndex = i;
        scene.tweens.add({
            targets: d,
            x: CONSTANTS.SLOT_START_X + i * CONSTANTS.SLOT_SPACING,
            y: CONSTANTS.GRID_Y,
            duration: 200,
            ease: 'Power2'
        });
    });

    let fromZone = null;
    if (inDefendZone) fromZone = 'defend';
    else if (inAttackZone) fromZone = 'attack';
    return fromZone;
}