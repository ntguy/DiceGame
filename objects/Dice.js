import { CONSTANTS } from '../config.js';
import { createDieBlueprint } from '../dice/CustomDiceDefinitions.js';
import { rollCustomDieValue, getDieEmoji, isZoneAllowedForDie, doesDieFaceValueTriggerRule } from '../dice/CustomDiceLogic.js';
import { callSceneMethod } from '../utils/SceneHelpers.js';
import { removeFromZones, snapIntoZone } from './DiceZone.js';

export function createDie(scene, slotIndex, blueprint, totalSlots = null) {
    const layoutArgs = Number.isFinite(totalSlots) ? { totalSlots } : {};
    const layout = callSceneMethod(scene, 'getHandSlotLayout', layoutArgs) || {};
    const spacing = Number.isFinite(layout.spacing) ? layout.spacing : CONSTANTS.SLOT_SPACING;
    const startX = Number.isFinite(layout.startX) ? layout.startX : CONSTANTS.SLOT_START_X;
    const x = startX + slotIndex * spacing;
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

    const lockIndicator = scene.add.text(0, -CONSTANTS.DIE_SIZE / 2 - 16, '🔒', {
        fontSize: '32px',
        color: '#f1c40f',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
    }).setOrigin(0.5).setVisible(false);
    container.add(lockIndicator);
    container.lockIndicator = lockIndicator;

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
        if (!this.wildBaseValueText || !this.wildBaseValueText.scene) {
            return;
        }
        this.wildBaseValueText.setText(`${value}`);
        this.wildBaseValueText.setVisible(true);
        this.bringToTop(this.wildBaseValueText);
        if (this.lockIndicator) {
            this.bringToTop(this.lockIndicator);
        }
    };

    container.hideWildBaseValueOverlay = function() {
        if (this.wildBaseValueText && this.wildBaseValueText.scene) {
            this.wildBaseValueText.setVisible(false);
        }
    };

    const emojiY = CONSTANTS.DIE_SIZE / 2 + 20;
    const emojiText = scene.add.text(0, emojiY, getDieEmoji(container), {
        fontSize: '32px',
        padding: CONSTANTS.EMOJI_TEXT_PADDING
    }).setOrigin(0.5, 0);
    container.add(emojiText);
    container.emojiText = emojiText;

    const leftStatusText = scene.add.text(0, emojiY, '', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ff7675',
        stroke: '#000000',
        strokeThickness: 3,
    }).setOrigin(1, 0);
    leftStatusText.setVisible(false);
    leftStatusText.defaultColor = '#ff7675';
    container.add(leftStatusText);
    container.leftStatusText = leftStatusText;

    const upgradePlusText = scene.add.text(0, emojiY, '+', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#f1c40f',
        stroke: '#000000',
        strokeThickness: 3,
    }).setOrigin(0, 0);
    upgradePlusText.setVisible(false);
    container.add(upgradePlusText);
    container.upgradePlusText = upgradePlusText;

    container.updateEmoji = function() {
        if (this.emojiText) {
            this.emojiText.setText(getDieEmoji(this));
        }

        if (this.leftStatusText) {
            const labelInfo = typeof scene.getDieLeftStatusText === 'function'
                ? scene.getDieLeftStatusText(this)
                : '';

            let labelText = '';
            let labelColor = null;

            if (labelInfo && typeof labelInfo === 'object') {
                const { text, color } = labelInfo;
                if (typeof text === 'string') {
                    labelText = text;
                } else if (Number.isFinite(text)) {
                    labelText = `${text}`;
                }
                if (typeof color === 'string') {
                    labelColor = color;
                }
            } else if (typeof labelInfo === 'string') {
                labelText = labelInfo;
            } else if (Number.isFinite(labelInfo)) {
                labelText = `${labelInfo}`;
            }

            const shouldShowLeft = labelText.length > 0;
            if (shouldShowLeft && this.emojiText && this.emojiText.text && this.emojiText.text.trim().length > 0) {
                this.leftStatusText.setText(labelText);
                const emojiHalfWidth = (this.emojiText && this.emojiText.displayWidth) ? this.emojiText.displayWidth / 2 : 0;
                const emojiX = this.emojiText ? this.emojiText.x : 0;
                const emojiYPosition = this.emojiText ? this.emojiText.y : emojiY;
                const spacing = 6;
                if (labelColor) {
                    this.leftStatusText.setStyle({ color: labelColor });
                } else if (this.leftStatusText.defaultColor) {
                    this.leftStatusText.setStyle({ color: this.leftStatusText.defaultColor });
                }
                this.leftStatusText.setVisible(true);
                this.leftStatusText.setX(emojiX - emojiHalfWidth - spacing);
                this.leftStatusText.setY(emojiYPosition);
            } else {
                this.leftStatusText.setVisible(false);
            }
        }

        if (this.upgradePlusText) {
            const hasEmoji = this.emojiText && this.emojiText.text && this.emojiText.text.trim().length > 0;
            const isUpgraded = !!(this.dieBlueprint && this.dieBlueprint.isUpgraded);
            if (isUpgraded && hasEmoji) {
                const emojiHalfWidth = (this.emojiText && this.emojiText.displayWidth) ? this.emojiText.displayWidth / 2 : 0;
                const emojiX = this.emojiText ? this.emojiText.x : 0;
                const emojiYPosition = this.emojiText ? this.emojiText.y : emojiY;
                this.upgradePlusText.setVisible(true);
                this.upgradePlusText.setX(emojiX + emojiHalfWidth);
                this.upgradePlusText.setY(emojiYPosition);
            } else {
                this.upgradePlusText.setVisible(false);
            }
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
        const dieAlpha = this.isWeakened ? 0.4 : 1;

        this.bg.fillColor = this.selected ? 0x2ecc71 : 0x444444;
        this.bg.setAlpha(dieAlpha);

        if (Array.isArray(this.pips)) {
            this.pips.forEach(pip => {
                if (pip && typeof pip.setAlpha === 'function') {
                    pip.setAlpha(dieAlpha);
                }
            });
        }

        if (this.wildBaseValueText) {
            if (typeof this.wildBaseValueText.baseAlpha !== 'number') {
                this.wildBaseValueText.baseAlpha = this.wildBaseValueText.alpha;
            }
            this.wildBaseValueText.setAlpha(this.wildBaseValueText.baseAlpha * dieAlpha);
        }

        if (this.lockIndicator) {
            this.lockIndicator.setVisible(this.isLocked);
            if (this.isLocked) {
                this.bringToTop(this.lockIndicator);
            }
        }
        const isBomb = this.dieBlueprint && this.dieBlueprint.id === 'bomb';
        const hasSceneLookup = isBomb && scene && typeof scene.getTimeBombStateByUid === 'function';
        const bombState = hasSceneLookup ? scene.getTimeBombStateByUid(this.dieBlueprint.uid) : null;
        const isDetonated = !!(bombState && bombState.detonated);
        const shouldDim = this.isNullified || isDetonated;

        if (this.emojiText) {
            this.emojiText.setAlpha(shouldDim ? 0.2 : 1);
        }
        if (this.upgradePlusText) {
            this.upgradePlusText.setAlpha(shouldDim ? 0.2 : 1);
        }
        if (this.leftStatusText) {
            this.leftStatusText.setAlpha(shouldDim ? 0.2 : 1);
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
        pip.setAlpha(container.isWeakened ? 0.5 : 1);
        container.pips.push(pip);
    });

    if (typeof container.updateFaceValueHighlight === 'function') {
        container.updateFaceValueHighlight();
    }

    if (container.lockIndicator) {
        container.bringToTop(container.lockIndicator);
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

    const baseLayout = callSceneMethod(scene, 'getHandSlotLayout') || {};
    const baseTotalSlots = Number.isFinite(baseLayout.totalSlots)
        ? baseLayout.totalSlots
        : callSceneMethod(scene, 'getHandSlotCount');
    const totalSlots = Math.max(1, Math.floor(Number(baseTotalSlots) || diceArray.length || 1));
    const spacing = Number.isFinite(baseLayout.spacing) ? baseLayout.spacing : CONSTANTS.SLOT_SPACING;
    const startX = Number.isFinite(baseLayout.startX) ? baseLayout.startX : CONSTANTS.SLOT_START_X;
    const maxIndex = Math.max(0, totalSlots - 1);

    const targetSlot = Phaser.Math.Clamp(
        Math.round((die.x - startX) / spacing),
        0,
        maxIndex
    );
    
    // Update array
    if (currentIndex !== -1) {
        diceArray.splice(currentIndex, 1);
    }
    const insertionIndex = Math.min(targetSlot, diceArray.length);
    diceArray.splice(insertionIndex, 0, die);

    // Update positions
    const layout = callSceneMethod(scene, 'getHandSlotLayout', { totalSlots }) || baseLayout;
    const layoutSpacing = Number.isFinite(layout.spacing) ? layout.spacing : spacing;
    const layoutStart = Number.isFinite(layout.startX) ? layout.startX : startX;

    diceArray.forEach((d, i) => {
        d.slotIndex = i;
        scene.tweens.add({
            targets: d,
            x: layoutStart + i * layoutSpacing,
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
