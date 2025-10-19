import { CONSTANTS } from '../config.js';
import { createDieBlueprint } from '../dice/CustomDiceDefinitions.js';
import { rollCustomDieValue, getDieEmoji, isZoneAllowedForDie, doesDieFaceValueTriggerRule } from '../dice/CustomDiceLogic.js';
import { callSceneMethod } from '../utils/SceneHelpers.js';
import { removeFromZones, snapIntoZone } from './DiceZone.js';

export function createDie(scene, slotIndex, blueprint) {
    const x = CONSTANTS.SLOT_START_X + slotIndex * CONSTANTS.SLOT_SPACING;
    const y = CONSTANTS.GRID_Y;
    const container = scene.add.container(x, y);

    const dieBlueprint = blueprint ? { ...blueprint } : createDieBlueprint('standard');
    container.dieBlueprint = dieBlueprint;

    const bg = scene.add.rectangle(0, 0, CONSTANTS.DIE_SIZE, CONSTANTS.DIE_SIZE, 0x444444)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, 0.35);
    container.add(bg);
    container.bg = bg;

    container.baseStrokeStyle = { width: 2, color: 0xffffff, alpha: 0.35 };
    container.highlightStrokeStyle = { width: 2, color: 0xf1c40f, alpha: 0.7 };
    container.currentZone = null;

    container.updateFaceValueHighlight = function() {
        const zone = typeof this.currentZone === 'string' ? this.currentZone : null;
        const shouldHighlight = doesDieFaceValueTriggerRule(this, { zone });
        const style = shouldHighlight ? this.highlightStrokeStyle : this.baseStrokeStyle;
        this.bg.setStrokeStyle(style.width, style.color, style.alpha);
        this.isFaceValueHighlighted = shouldHighlight;
    };

    const lockOverlay = scene.add.rectangle(0, 0, CONSTANTS.DIE_SIZE + 12, CONSTANTS.DIE_SIZE + 12, 0x8e44ad, 0.35)
        .setOrigin(0.5)
        .setStrokeStyle(3, 0xf1c40f, 0.8)
        .setVisible(false)
        .setAngle(8);
    container.add(lockOverlay);
    container.lockOverlay = lockOverlay;

    container.value = 1;
    container.selected = false;
    container.slotIndex = slotIndex;
    container.pips = [];
    container.isLocked = false;
    container.isWeakened = false;
    container.isNullified = false;
    container.displayValue = container.value;
    container.displayPipColor = 0xffffff;
    container.isFaceValueHighlighted = false;

    container.renderFace = function(faceValue, { pipColor, updateValue = true } = {}) {
        // Wild One relic: render rolled 1s with black pips when active.
        const color = typeof pipColor === 'number' ? pipColor : (faceValue === 1 && scene.hasWildOneRelic ? 0x000000 : 0xffffff);
        drawDiePips(scene, container, faceValue, { pipColor: color, updateValue });
    };

    const wildBaseValueText = scene.add.text(0, 0, '', {
        fontSize: '36px',
        color: '#cccccc',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
    }).setOrigin(0.5).setVisible(false);
    wildBaseValueText.setAlpha(0.25);
    container.add(wildBaseValueText);
    container.wildBaseValueText = wildBaseValueText;

    container.showWildBaseValueOverlay = function(value) {
        if (!this.wildBaseValueText) {
            return;
        }
        this.wildBaseValueText.setText(`${value}`);
        this.wildBaseValueText.setVisible(true);
        this.bringToTop(this.wildBaseValueText);
        if (this.lockOverlay) {
            this.bringToTop(this.lockOverlay);
        }
    };

    container.hideWildBaseValueOverlay = function() {
        if (this.wildBaseValueText) {
            this.wildBaseValueText.setVisible(false);
        }
    };

    const emojiY = CONSTANTS.DIE_SIZE / 2 + 20;
    const emojiText = scene.add.text(0, emojiY, getDieEmoji(container), {
        fontSize: '28px',
        padding: CONSTANTS.EMOJI_TEXT_PADDING
    }).setOrigin(0.5, 0);
    container.add(emojiText);
    container.emojiText = emojiText;

    container.updateEmoji = function() {
        if (this.emojiText) {
            this.emojiText.setText(getDieEmoji(this));
        }
    };

    // Add die methods
    container.roll = function() {
        const rolledValue = rollCustomDieValue(scene, container);
        // Wild One relic: default rerolls of 1 should appear as wild (black) pips.
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

    container.setNullified = function(isNullified) {
        this.isNullified = !!isNullified;
        if (typeof this.hideWildBaseValueOverlay === 'function' && this.isNullified) {
            this.hideWildBaseValueOverlay();
        }
        this.updateVisualState();
        if (typeof this.updateFaceValueHighlight === 'function') {
            this.updateFaceValueHighlight();
        }
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
        if (this.emojiText) {
            this.emojiText.setAlpha(this.isNullified ? 0.2 : 1);
        }
    };

    const initialValue = rollCustomDieValue(scene, container);
    const initialPipColor = initialValue === 1 && scene.hasWildOneRelic ? 0x000000 : 0xffffff;
    container.renderFace(initialValue, { pipColor: initialPipColor, updateValue: true });
    container.updateVisualState();
    container.updateEmoji();

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
        const canDefend = isZoneAllowedForDie(container, 'defend') && scene.defendSlots.includes(null);
        const canAttack = isZoneAllowedForDie(container, 'attack') && scene.attackSlots.includes(null);
        scene.defendHighlight.setVisible(dragY < CONSTANTS.GRID_Y - 50 && dragX < 400 && canDefend);
        scene.attackHighlight.setVisible(dragY < CONSTANTS.GRID_Y - 50 && dragX > 400 && canAttack);
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
            if (container.x < 400 && isZoneAllowedForDie(container, 'defend')) {
                snapIntoZone(container, scene.defendSlots, scene.defendDice, 200, zoneY, scene);
            } else if (container.x >= 400 && isZoneAllowedForDie(container, 'attack')) {
                snapIntoZone(container, scene.attackSlots, scene.attackDice, 600, zoneY, scene);
            } else {
                snapToGrid(container, scene.dice, scene);
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

    if (typeof container.updateFaceValueHighlight === 'function') {
        container.updateFaceValueHighlight();
    }

    if (container.lockOverlay) {
        container.bringToTop(container.lockOverlay);
    }
    if (container.wildBaseValueText) {
        container.bringToTop(container.wildBaseValueText);
    }
    container.sendToBack(container.bg);
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

    die.currentZone = null;
    if (typeof die.updateFaceValueHighlight === 'function') {
        die.updateFaceValueHighlight();
    }

    callSceneMethod(scene, 'updateZonePreviewText');
}
