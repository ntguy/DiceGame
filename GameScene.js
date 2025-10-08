import { CONSTANTS } from './config.js';
import { createDie } from './objects/Dice.js';
import { setupZones } from './objects/DiceZone.js';
import { setupButtons, setupHealthBar, setupEnemyUI } from './objects/UI.js';
import { displayComboTable, evaluateCombo, scoreCombo } from './systems/ComboSystem.js';
import { EnemyManager } from './systems/EnemySystem.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Game state
        this.dice = [];
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.playerMaxHealth = 100;
        this.playerHealth = this.playerMaxHealth;
        this.healthBar = null;
        this.enemyManager = null;
        this.enemyHealthBar = null;
        this.enemyIntentText = null;
        this.upcomingEnemyMove = null;
        this.isResolving = false;
        this.playerBlockValue = 0;
        this.lockedDice = new Set();
        this.pendingLockCount = 0;
    }
    
    preload() {
        this.load.audio('diceRoll', './audio/single-dice-roll.mp3');
        this.load.audio('multiDiceRoll', './audio/multi-dice-roll.mp3');
        this.load.audio('swoosh', './audio/swoosh.mp3');
        this.load.audio('chimeShort', './audio/chime-short.mp3');
        this.load.audio('chimeLong', './audio/chime-long.mp3');
    }
    
    create() {
        // --- Dice arrays for zones ---
        this.defendDice = [];
        this.attackDice = [];
        this.defendSlots = Array(6).fill(null);
        this.attackSlots = Array(6).fill(null);

        // --- Zones ---
        setupZones(this);

        // --- Buttons ---
        setupButtons(this);
        this.updateRollButtonState();

        // --- Combo table ---
        displayComboTable(this);
        
        // --- Health bar ---
        this.healthBar = setupHealthBar(this);
        this.updateHealthUI();

        // --- Enemy ---
        this.enemyManager = new EnemyManager();
        const initialEnemy = this.enemyManager.getCurrentEnemy();
        this.enemyHealthBar = setupEnemyUI(this, initialEnemy ? initialEnemy.name : '???');
        this.enemyIntentText = this.enemyHealthBar.intentText;
        this.updateEnemyHealthUI();
        this.prepareNextEnemyMove();

        // --- Roll counter ---
        this.rollsRemainingText = this.add.text(100, CONSTANTS.BUTTONS_Y, `${CONSTANTS.DEFAULT_MAX_ROLLS}`, { 
            fontSize: "24px", 
            color: "#fff" 
        }).setOrigin(0.5);
    }
    
    update() {
        // Update logic here
    }
    
    rollDice() {
        // Determine which sound to play
        const diceSelectedCount = this.dice.filter(d => d.selected).length;
        const isFirstRoll = this.rollsRemaining === CONSTANTS.DEFAULT_MAX_ROLLS;

        if (isFirstRoll || diceSelectedCount === 6) { // TODO replace 6 with const
            this.sound.play('multiDiceRoll');
            this.sound.play('diceRoll', { volume: 0.75 });
            this.time.delayedCall(Phaser.Math.Between(100, 300), () => {
                this.sound.play('diceRoll', { volume: 0.5 });
            });
        } else {
            const defaultVolume = 0.6;
            for (let i=0; i < diceSelectedCount; i++) {
                const delay = i == 0 ? 0 : Phaser.Math.Between(100, 300);
                this.time.delayedCall(delay, () => {
                    this.sound.play('diceRoll', { volume: ((defaultVolume/(i+1)) + 0.05) });
                });
            }
        }

        // First roll → create dice
        if (isFirstRoll) {
            this.dice = [];
            for (let i = 0; i < 6; i++) {
                const die = createDie(this, i);
                this.dice.push(die);
            }
        }

        // Roll dice (first roll = all dice, later rolls = only selected dice)
        this.dice.forEach(d => {
            if (isFirstRoll || d.selected) {
                d.roll();
                d.selected = false;
                d.updateVisualState();
            }
        });

        if (isFirstRoll) {
            this.applyPendingLocks();
        }



        // Decrement rolls remaining
        this.rollsRemaining--;
        this.rollsRemainingText.setText(this.rollsRemaining);

        this.updateRollButtonState();

        // Enable sort button after the first roll
        this.sortButton.setAlpha(1);
        this.sortButton.setInteractive();
    }

    applyPendingLocks() {
        if (this.pendingLockCount <= 0 || this.dice.length === 0) {
            return;
        }

        const availableDice = this.dice.filter(die => !die.isLocked);
        if (availableDice.length === 0) {
            return;
        }

        const locksToApply = Math.min(this.pendingLockCount, availableDice.length);
        let remainingLocks = locksToApply;
        const candidates = [...availableDice];

        while (remainingLocks > 0 && candidates.length > 0) {
            const index = Phaser.Math.Between(0, candidates.length - 1);
            const die = candidates.splice(index, 1)[0];
            if (this.lockDie(die)) {
                remainingLocks--;
            }
        }

        this.pendingLockCount = Math.max(0, this.pendingLockCount - locksToApply);
        this.updateRollButtonState();
    }

    lockDie(die) {
        if (!die || die.isLocked) {
            return false;
        }

        die.setLocked(true);
        this.lockedDice.add(die);
        return true;
    }

    queueEnemyLocks(count) {
        if (!count || count <= 0) {
            return;
        }

        this.pendingLockCount = Math.min(6, this.pendingLockCount + count);
    }

    sortDice() {
        this.sound.play('swoosh', { volume: 0.6 });
        this.dice.sort((a, b) => a.value - b.value);
        this.dice.forEach((d, i) => {
            d.slotIndex = i;
            this.tweens.add({ 
                targets: d, 
                x: CONSTANTS.SLOT_START_X + i * CONSTANTS.SLOT_SPACING, 
                y: CONSTANTS.GRID_Y, 
                duration: 200, 
                ease: 'Power2' 
            });
        });
    }

    resolveDice() {
        if (this.isResolving) {
            return;
        }
        this.isResolving = true;

        this.disableAllInputs();

        // Play resolve sound effect
        this.sound.play('chimeShort', { volume: 0.7 });
        this.sound.play('chimeLong', {
            volume: 0.4,
            seek: 1.5,
            duration: 1,
            rate: 3
        });

        // Calculate scores
        const defendType = evaluateCombo(this.defendDice).type;
        const attackType = evaluateCombo(this.attackDice).type;
        const defendBonus = scoreCombo(defendType);
        const attackBonus = scoreCombo(attackType);
        const defendSummation = this.defendDice.reduce((sum, die) => sum + die.value, 0);
        const attackSummation = this.attackDice.reduce((sum, die) => sum + die.value, 0);
        const defendScore = defendSummation + defendBonus;
        const attackScore = attackSummation + attackBonus;

        // Update or create score text
        if (!this.defendText) {
            this.defendText = this.add.text(200, CONSTANTS.RESOLVE_TEXT_Y, "", {
                fontSize: "28px",
                color: "#3498db"
            }).setOrigin(0.5);

            this.attackText = this.add.text(600, CONSTANTS.RESOLVE_TEXT_Y, "", {
                fontSize: "28px",
                color: "#e74c3c"
            }).setOrigin(0.5);
        }

        this.defendText.setText(`${defendType}: ${defendScore}`);
        this.attackText.setText(`${attackType}: ${attackScore}`);

        // Ensure visible
        this.defendText.setAlpha(1);
        this.attackText.setAlpha(1);

        // Fade the combo texts above the zones over 4 seconds, then destroy them
        this.tweens.add({
            targets: [ this.defendText, this.attackText ],
            alpha: 0,
            duration: 2000,
            delay: 2000,
            ease: 'Cubic',
            onComplete: () => {
                if (this.defendText) { this.defendText.destroy(); this.defendText = null; }
                if (this.attackText) { this.attackText.destroy(); this.attackText = null; }
            }
        });

        const locksToCarryOver = Array.from(this.lockedDice).filter(die =>
            this.defendDice.includes(die) || this.attackDice.includes(die)
        ).length;

        const diceToResolve = this.getDiceInPlay();
        const finishResolution = () => {
            if (locksToCarryOver > 0) {
                this.pendingLockCount = Math.min(6, this.pendingLockCount + locksToCarryOver);
            }
            this.lockedDice.clear();
            this.processTurnOutcome({ attackScore, defendScore });
            this.resetGameState({ destroyDice: false });
            this.input.enabled = true;
            if (this.resolveButton) {
                this.resolveButton.setAlpha(1);
                this.resolveButton.setInteractive();
            }
            this.isResolving = false;
        };

        if (diceToResolve.length === 0) {
            this.time.delayedCall(1000, finishResolution);
            return;
        }

        Promise.all(diceToResolve.map(die => {
            const target = this.getResolutionTarget(die);
            return this.animateDieResolution(die, target);
        })).then(finishResolution);
    }

    disableAllInputs() {
        this.input.enabled = false;

        if (this.rollButton) {
            this.rollButton.disableInteractive();
            this.rollButton.setAlpha(0.5);
        }

        if (this.sortButton) {
            this.sortButton.disableInteractive();
            this.sortButton.setAlpha(0.5);
        }

        if (this.resolveButton) {
            this.resolveButton.disableInteractive();
            this.resolveButton.setAlpha(0.5);
        }
    }

    getDiceInPlay() {
        const combined = [...this.defendDice, ...this.attackDice, ...this.dice];
        return Array.from(new Set(combined));
    }

    getResolutionTarget(die) {
        if (this.defendDice.includes(die) && this.defendZoneCenter) {
            return this.defendZoneCenter;
        }

        if (this.attackDice.includes(die) && this.attackZoneCenter) {
            return this.attackZoneCenter;
        }

        if (this.defendZoneCenter && this.attackZoneCenter) {
            const midpoint = (this.defendZoneCenter.x + this.attackZoneCenter.x) / 2;
            return die.x < midpoint ? this.defendZoneCenter : this.attackZoneCenter;
        }

        return { x: die.x, y: die.y - 100 };
    }

    animateDieResolution(die, target) {
        return new Promise(resolve => {
            const upwardOffset = 180;

            die.disableInteractive();
            die.setDepth(10);
            die.setAlpha(1);

            const inZone = this.defendDice.includes(die) || this.attackDice.includes(die);

            let fadeTween = null;

            const completeResolution = () => {
                if (fadeTween && fadeTween.isPlaying()) {
                    fadeTween.stop();
                }

                if (die.active) {
                    die.destroy();
                }

                resolve();
            };

            if (inZone) {
                // Move (launch) upward then complete
                const moveTarget = {
                    x: target.x,
                    y: target.y - upwardOffset
                };

                this.tweens.add({
                    targets: die,
                    ...moveTarget,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    onComplete: completeResolution
                });

                // Fade out in parallel
                fadeTween = this.tweens.add({
                    targets: die,
                    alpha: 0,
                    duration: 400,
                    delay: 100,
                    ease: 'Quad.easeIn'
                });
            } else {
                // Not in a zone — do not move, just fade (then destroy)
                fadeTween = this.tweens.add({
                    targets: die,
                    alpha: 0,
                    duration: 350,
                    ease: 'Quad.easeIn',
                    onComplete: completeResolution
                });
            }
        });
    }

    applyDamage(amount) {
        this.playerHealth = Math.max(0, this.playerHealth - amount);
        this.updateHealthUI();
    }

    updateHealthUI() {
        if (!this.healthBar) {
            return;
        }

        const healthRatio = Phaser.Math.Clamp(this.playerHealth / this.playerMaxHealth, 0, 1);
        this.healthBar.barFill.displayWidth = this.healthBar.barWidth * healthRatio;
        this.healthBar.text.setText(`HP: ${this.playerHealth}/${this.playerMaxHealth}`);
    }

    processTurnOutcome({ attackScore, defendScore }) {
        if (!this.enemyManager) {
            return;
        }

        this.playerBlockValue = defendScore;

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy) {
            this.handleAllEnemiesDefeated();
            this.playerBlockValue = 0;
            return;
        }

        this.enemyManager.applyPlayerAttack(attackScore);
        this.updateEnemyHealthUI();

        if (this.enemyManager.isCurrentEnemyDefeated()) {
            this.handleEnemyDefeat();
            this.playerBlockValue = 0;
            return;
        }

        this.executeEnemyTurn();
    }

    updateEnemyHealthUI() {
        if (!this.enemyHealthBar) {
            return;
        }

        const enemy = this.enemyManager ? this.enemyManager.getCurrentEnemy() : null;
        if (!enemy) {
            this.enemyHealthBar.barFill.displayWidth = 0;
            this.enemyHealthBar.text.setText('HP: 0/0');
            return;
        }

        const ratio = Phaser.Math.Clamp(enemy.health / enemy.maxHealth, 0, 1);
        this.enemyHealthBar.barFill.displayWidth = this.enemyHealthBar.barWidth * ratio;
        this.enemyHealthBar.text.setText(`HP: ${enemy.health}/${enemy.maxHealth}`);
    }

    prepareNextEnemyMove() {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            this.upcomingEnemyMove = null;
            if (this.enemyIntentText) {
                this.enemyIntentText.setText('All enemies defeated');
            }
            return;
        }

        this.upcomingEnemyMove = this.enemyManager.prepareNextMove();
        if (this.enemyIntentText) {
            const label = this.upcomingEnemyMove ? this.upcomingEnemyMove.label : '...';
            this.enemyIntentText.setText(`Next: ${label}`);
        }
    }

    executeEnemyTurn() {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            return;
        }

        const move = this.enemyManager.consumeUpcomingMove();
        this.upcomingEnemyMove = null;

        if (!move) {
            this.prepareNextEnemyMove();
            this.playerBlockValue = 0;
            return;
        }

        move.actions.forEach(action => {
            if (action.type === 'attack') {
                this.handleEnemyAttack(action.value);
            } else if (action.type === 'heal') {
                this.enemyManager.healCurrentEnemy(action.value);
                this.updateEnemyHealthUI();
            } else if (action.type === 'defend') {
                this.enemyManager.addEnemyBlock(action.value);
            } else if (action.type === 'lock') {
                this.queueEnemyLocks(action.count || 1);
            }
        });

        this.playerBlockValue = 0;

        if (!this.enemyManager.isCurrentEnemyDefeated()) {
            this.prepareNextEnemyMove();
        } else {
            this.handleEnemyDefeat();
        }
    }

    handleEnemyAttack(amount) {
        if (amount <= 0) {
            return;
        }

        const mitigated = Math.min(this.playerBlockValue, amount);
        const damage = Math.max(0, amount - mitigated);
        this.playerBlockValue = Math.max(0, this.playerBlockValue - amount);

        if (damage > 0) {
            this.applyDamage(damage);
        }
    }

    handleEnemyDefeat() {
        if (!this.enemyManager) {
            return;
        }

        const hasNextEnemy = this.enemyManager.advanceToNextEnemy();
        if (hasNextEnemy) {
            this.onNewEnemyEncounter();
        } else {
            this.handleAllEnemiesDefeated();
        }
    }

    onNewEnemyEncounter() {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy) {
            this.handleAllEnemiesDefeated();
            return;
        }

        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            this.enemyHealthBar.nameText.setText(enemy.name);
        }

        this.updateEnemyHealthUI();
        this.prepareNextEnemyMove();
    }

    handleAllEnemiesDefeated() {
        this.upcomingEnemyMove = null;

        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            this.enemyHealthBar.nameText.setText('All Enemies Defeated');
        }

        if (this.enemyIntentText) {
            this.enemyIntentText.setText('All enemies defeated');
        }

        this.updateEnemyHealthUI();
    }

    resetGameState({ destroyDice = true } = {}) {
        if (destroyDice) {
            this.getDiceInPlay().forEach(d => d.destroy());
        }
        this.dice = [];
        this.defendDice = [];
        this.attackDice = [];
        this.defendSlots = Array(6).fill(null);
        this.attackSlots = Array(6).fill(null);

        this.playerBlockValue = 0;

        // Reset roll counter
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.rollsRemainingText.setText(CONSTANTS.DEFAULT_MAX_ROLLS);

        // Enable roll button, disable sort button
        this.rollButton.setAlpha(1);
        this.rollButton.setInteractive();
        this.sortButton.setAlpha(0.5);
        this.sortButton.disableInteractive();
        if (this.resolveButton) {
            this.resolveButton.setAlpha(1);
            this.resolveButton.setInteractive();
        }

        this.lockedDice.clear();

        // Reset combo highlights
        this.comboTextGroup.forEach(t => t.setColor("#ffffff"));
    }
    
    updateRollButtonState() {
        // If no rolls left -> disabled
        if (this.rollsRemaining === 0) {
            this.rollButton.setAlpha(0.5);
            this.rollButton.disableInteractive();
            return;
        }

        // First roll (before any rolls used) -> always enabled
        if (this.rollsRemaining === CONSTANTS.DEFAULT_MAX_ROLLS) {
            this.rollButton.setAlpha(1);
            this.rollButton.setInteractive();
            return;
        }

        // Otherwise: enable only if at least one die is selected
        const anySelected = this.dice.some(d => d.selected);
        if (anySelected) {
            this.rollButton.setAlpha(1);
            this.rollButton.setInteractive();
        } else {
            this.rollButton.setAlpha(0.5);
            this.rollButton.disableInteractive();
        }
    }
}
