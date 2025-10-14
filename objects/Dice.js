import { CONSTANTS } from '../config.js';
import { removeFromZones, snapIntoZone } from './DiceZone.js';
import {
    cloneDieState,
    createDieState,
    getAllowedZones,
    getDieEmoji,
    rollValueForDie
} from '../systems/CustomDiceLogic.js';

export function createDie(scene, slotIndex, dieStateInput = null) {
    const x = CONSTANTS.SLOT_START_X + slotIndex * CONSTANTS.SLOT_SPACING;
    const y = CONSTANTS.GRID_Y;
    const container = scene.add.container(x, y);

    const dieState = cloneDieState(dieStateInput || createDieState('standard'));
    container.dieState = dieState;
    container.allowedZones = getAllowedZones(dieState);

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

    container.value = rollValueForDie(dieState);
    container.selected = false;
    container.slotIndex = slotIndex;
    container.pips = [];
    container.isLocked = false;
    container.isWeakened = false;
    container.displayValue = container.value;
    container.displayPipColor = 0xffffff;

    const emojiText = scene.add.text(0, CONSTANTS.DIE_SIZE / 2 + 6, '', {
        fontSize: '24px',
        color: '#ffffff'
    }).setOrigin(0.5, 0);
    container.emojiText = emojiText;
    container.add(emojiText);

    container.updateEmoji = function() {
        const emoji = getDieEmoji(this.dieState);
        this.emojiText.setText(emoji || '');
        this.emojiText.setVisible(Boolean(emoji));
    };

    container.renderFace = function(faceValue, { pipColor, updateValue = true } = {}) {
        const color = typeof pipColor === 'number' ? pipColor : (faceValue === 1 && scene.hasWildOneRelic ? 0x000000 : 0xffffff);
        drawDiePips(scene, container, faceValue, { pipColor: color, updateValue });
        container.updateEmoji();
    };

    // Add die methods
    container.roll = function() {
        const rolledValue = rollValueForDie(this.dieState);
        const pipColor = rolledValue === 1 && scene.hasWildOneRelic ? 0x000000 : 0xffffff;
        this.renderFace(rolledValue, { pipColor, updateValue: true });
    };

    container.setLocked = function(isLocked) {
        this.isLocked = isLocked;
        if (isLocked) {
            this.selected = false;
        }
        this.updateVisualState();
    };

    container.setWeakened = function(isWeakened) {
        this.isWeakened = !!isWeakened;
        this.updateVisualState();
    };

    container.updateVisualState = function() {
        if (this.isLocked) {
            this.bg.fillColor = 0x5b2c6f;
            this.lockOverlay.setVisible(true);
        } else {
            this.lockOverlay.setVisible(false);
            this.bg.fillColor = this.selected ? 0x2ecc71 : 0x444444;
        }
        this.setAlpha(this.isWeakened ? 0.5 : 1);
    };

    const initialPipColor = container.value === 1 && scene.hasWildOneRelic ? 0x000000 : 0xffffff;
    container.renderFace(container.value, { pipColor: initialPipColor, updateValue: true });
    container.updateVisualState();
    container.updateEmoji();

    container.setSize(CONSTANTS.DIE_SIZE, CONSTANTS.DIE_SIZE);
    container.setInteractive();
    scene.input.setDraggable(container);

    container.isZoneAllowed = function(zone) {
        if (!zone) {
            return true;
        }
        if (!Array.isArray(this.allowedZones) || this.allowedZones.length === 0) {
            return true;
        }
        return this.allowedZones.includes(zone);
    };

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
        const canDefend = container.isZoneAllowed('defend');
        const canAttack = container.isZoneAllowed('attack');
        scene.defendHighlight.setVisible(
            dragY < CONSTANTS.GRID_Y - 50
            && dragX < 400
            && canDefend
            && scene.defendSlots.includes(null)
        );
        scene.attackHighlight.setVisible(
            dragY < CONSTANTS.GRID_Y - 50
            && dragX > 400
            && canAttack
            && scene.attackSlots.includes(null)
        );
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
                if (container.isZoneAllowed('defend')) {
                    snapIntoZone(container, scene.defendSlots, scene.defendDice, 200, zoneY, scene, 'defend');
                } else {
                    snapToGrid(container, scene.dice, scene);
                }
            } else {
                if (container.isZoneAllowed('attack')) {
                    snapIntoZone(container, scene.attackSlots, scene.attackDice, 600, zoneY, scene, 'attack');
                } else {
                    snapToGrid(container, scene.dice, scene);
                }
            }
        } else {
            // Dropped back into main row
            snapToGrid(container, scene.dice, scene);
        }
    });

    return container;
}

function drawDiePips(scene, container, value, { pipColor = 0xffffff, updateValue = true } = {}) {
    if (updateValue) {
        container.value = value;
    }
    container.displayValue = value;
    container.displayPipColor = pipColor;
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

    const pipPositions = positions[value] || [];
    pipPositions.forEach(([dx, dy]) => {
        const pip = scene.add.circle(dx, dy, 6, pipColor);
        container.add(pip);
        container.pips.push(pip);
    });

    if (container.lockOverlay) {
        container.bringToTop(container.lockOverlay);
        container.sendToBack(container.bg);
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

    if (scene && typeof scene.updateZonePreviewText === 'function') {
        scene.updateZonePreviewText();
    }
}
