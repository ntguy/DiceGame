import { CONSTANTS } from './config.js';
import { createDie } from './objects/Dice.js';
import { setupZones } from './objects/DiceZone.js';
import { setupButtons, setupHealthBar, setupEnemyUI, setupMuteButton } from './objects/UI.js';
import { displayComboTable, evaluateCombo, scoreCombo } from './systems/ComboSystem.js';
import { EnemyManager } from './systems/EnemySystem.js';
import { GameOverManager } from './systems/GameOverSystem.js';
import { PathManager, PATH_NODE_TYPES } from './systems/PathManager.js';
import { PathUI } from './objects/PathUI.js';
import { InfirmaryUI } from './objects/InfirmaryUI.js';
import { ShopUI } from './objects/ShopUI.js';
import { LuckyPipRelic } from './relics/LuckyPipRelic.js';
import { ReinforcedCaseRelic } from './relics/ReinforcedCaseRelic.js';
import { GleamingCoreRelic } from './relics/GleamingCoreRelic.js';

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
        this.playerBurn = 0;
        this.playerBurnText = null;
        this.playerBurnGlowTween = null;
        this.lockedDice = new Set();
        this.pendingLockCount = 0;
        this.gameOverManager = null;
        this.muteButton = null;
        this.isMuted = false;
        this.isGameOver = false;
        this.pathManager = null;
        this.pathUI = null;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.playerGold = 0;
        this.goldText = null;
        this.nodeMessage = null;
        this.nodeMessageTween = null;
        this.zoneVisuals = [];
        this.comboHeaderText = null;
        this.activeFacilityUI = null;
        this.relicCatalog = [];
        this.relics = [];
        this.ownedRelicIds = new Set();
        this.relicVisuals = [];
        this.relicInteractiveAreas = [];
        this.relicInfoText = null;
        this.selectedRelicId = null;
    }

    init(data) {
        this.destroyFacilityUI();
        this.isMuted = data && typeof data.isMuted === 'boolean' ? data.isMuted : false;
        this.isGameOver = false;
        this.gameOverManager = null;
        this.muteButton = null;
        this.pathManager = null;
        this.pathUI = null;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.playerGold = 0;
        this.nodeMessage = null;
        this.nodeMessageTween = null;
        this.zoneVisuals = [];
        this.comboHeaderText = null;
        this.activeFacilityUI = null;
        this.relicCatalog = [];
        this.relics = [];
        this.ownedRelicIds = new Set();
        this.relicVisuals = [];
        this.relicInteractiveAreas = [];
        this.relicInfoText = null;
        this.selectedRelicId = null;
    }

    preload() {
        this.load.audio('diceRoll', './audio/single-dice-roll.mp3');
        this.load.audio('multiDiceRoll', './audio/multi-dice-roll.mp3');
        this.load.audio('swoosh', './audio/swoosh.mp3');
        this.load.audio('chimeShort', './audio/chime-short.mp3');
        this.load.audio('chimeLong', './audio/chime-long.mp3');
    }
    
    create() {
        this.dice = [];
        this.lockedDice = new Set();
        this.pendingLockCount = 0;
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.playerBlockValue = 0;
        this.playerBurn = 0;
        this.playerHealth = this.playerMaxHealth;
        this.playerBurnText = null;
        this.playerBurnGlowTween = null;
        this.playerGold = 0;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.relicCatalog = [
            new LuckyPipRelic(),
            new ReinforcedCaseRelic(),
            new GleamingCoreRelic()
        ];
        this.relics = [];
        this.ownedRelicIds = new Set();
        this.relicVisuals = [];
        this.relicInteractiveAreas = [];
        this.relicInfoText = null;
        this.selectedRelicId = null;

        // --- Dice arrays for zones ---
        this.defendDice = [];
        this.attackDice = [];
        this.defendSlots = Array(6).fill(null);
        this.attackSlots = Array(6).fill(null);

        // --- Zones ---
        setupZones(this);
        if (!this.zoneVisuals) {
            this.zoneVisuals = [];
        }

        // --- Buttons ---
        setupButtons(this);
        this.updateRollButtonState();

        this.muteButton = setupMuteButton(this, () => this.toggleMute());

        // --- Combo table ---
        displayComboTable(this);
        this.createRelicShelf();

        // --- Health bar ---
        this.healthBar = setupHealthBar(this);
        this.updateHealthUI();

        this.goldText = this.add.text(20, this.healthBar.text.y + 28, '', {
            fontSize: '20px',
            color: '#f1c40f'
        });
        this.updateGoldUI();

        this.playerBurnText = this.add.text(0, 0, '', {
            fontSize: '20px',
            color: '#ffb347',
            fontStyle: 'bold'
        }).setVisible(false);
        this.updateBurnUI();

        // --- Enemy ---
        this.enemyManager = new EnemyManager();
        const initialEnemy = this.enemyManager.getCurrentEnemy();
        this.enemyHealthBar = setupEnemyUI(this, initialEnemy ? initialEnemy.name : '???');
        this.enemyIntentText = this.enemyHealthBar.intentText;
        this.updateEnemyHealthUI();
        this.prepareNextEnemyMove();

        this.pathManager = new PathManager();
        this.pathUI = new PathUI(this, this.pathManager, node => this.handlePathNodeSelection(node));

        this.sound.mute = this.isMuted;
        this.updateMuteButtonState();

        this.gameOverManager = new GameOverManager(this);
        this.gameOverManager.create();

        // --- Roll counter ---
        this.rollsRemainingText = this.add.text(100, CONSTANTS.BUTTONS_Y, `${CONSTANTS.DEFAULT_MAX_ROLLS}`, {
            fontSize: "24px",
            color: "#fff"
        }).setOrigin(0.5);

        this.enterMapState();
    }

    update() {
        // Update logic here
    }

    createRelicShelf() {
        if (this.relicInfoText) {
            this.relicInfoText.destroy();
            this.relicInfoText = null;
        }

        if (this.relicVisuals && Array.isArray(this.relicVisuals)) {
            this.relicVisuals.forEach(obj => obj.destroy());
        }
        this.relicVisuals = [];
        this.relicInteractiveAreas = [];

        this.relicInfoText = this.add.text(CONSTANTS.RIGHT_UI_X, CONSTANTS.RELIC_INFO_Y, '', {
            fontSize: '20px',
            color: '#f9e79f',
            align: 'right',
            wordWrap: { width: 260 }
        }).setOrigin(1, 0);
        this.relicInfoText.setText('');

        this.selectedRelicId = null;
        this.updateRelicDisplay();
    }

    updateRelicDisplay() {
        if (this.relicVisuals && Array.isArray(this.relicVisuals)) {
            this.relicVisuals.forEach(obj => obj.destroy());
        }
        this.relicVisuals = [];
        this.relicInteractiveAreas = [];

        const startX = CONSTANTS.RIGHT_UI_X;
        const baseY = CONSTANTS.RELIC_TRAY_Y;
        const spacing = CONSTANTS.RELIC_SPACING;
        const size = CONSTANTS.RELIC_ICON_SIZE;

        this.relics.forEach((relic, index) => {
            const x = startX - index * spacing;
            const iconBg = this.add.rectangle(x, baseY, size, size, 0x1c1c1c, 0.85)
                .setOrigin(0.5)
                .setStrokeStyle(2, 0xf1c40f, 0.9)
                .setInteractive({ useHandCursor: true });
            iconBg.setFillStyle(0x1c1c1c, 0.85);

            const iconText = this.add.text(x, baseY, relic.icon || '♦', {
                fontSize: `${CONSTANTS.RELIC_ICON_FONT}px`
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            const handleClick = () => this.showRelicDetails(relic);
            iconBg.on('pointerdown', handleClick);
            iconText.on('pointerdown', handleClick);

            this.relicVisuals.push(iconBg, iconText);
            this.relicInteractiveAreas.push({ id: relic.id, bg: iconBg, icon: iconText });
        });

        this.updateRelicHighlights();
    }

    showRelicDetails(relic) {
        if (!relic || !this.relicInfoText) {
            return;
        }

        this.selectedRelicId = relic.id;
        this.relicInfoText.setText([relic.name, relic.description]);
        this.updateRelicHighlights();
    }

    updateRelicHighlights() {
        if (!Array.isArray(this.relicInteractiveAreas)) {
            return;
        }

        this.relicInteractiveAreas.forEach(area => {
            if (!area || !area.bg) {
                return;
            }

            const isSelected = this.selectedRelicId === area.id;
            if (isSelected) {
                area.bg.setStrokeStyle(3, 0xffffff, 1);
                area.bg.setFillStyle(0x3a2f0f, 0.95);
            } else {
                area.bg.setStrokeStyle(2, 0xf1c40f, 0.9);
                area.bg.setFillStyle(0x1c1c1c, 0.85);
            }

            if (area.icon) {
                area.icon.setAlpha(isSelected ? 1 : 0.9);
            }
        });
    }
    
    rollDice() {
        if (!this.inCombat || this.isGameOver) {
            return;
        }

        // Determine which sound to play
        let diceInPlay = this.getDiceInPlay();
        const diceSelectedCount = diceInPlay.filter(d => d.selected).length;
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
            diceInPlay = this.getDiceInPlay();
        }

        // Roll dice (first roll = all dice, later rolls = only selected dice)
        diceInPlay.forEach(d => {
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
        if (!this.inCombat || this.isGameOver) {
            return;
        }

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
        if (!this.inCombat || this.isGameOver) {
            return;
        }

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
            this.resetGameState({ destroyDice: false });
            this.input.enabled = true;
            if (this.resolveButton) {
                this.resolveButton.setAlpha(1);
                this.resolveButton.setInteractive();
            }
            this.isResolving = false;
        };

        this.processTurnOutcome({ attackScore, defendScore });

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

        if (this.playerHealth === 0) {
            this.triggerGameOver();
        }
    }

    updateHealthUI() {
        if (!this.healthBar) {
            return;
        }

        this.animateHealthBar(this.healthBar, this.playerHealth, this.playerMaxHealth);
    }

    stopHealthBarTweens(bar) {
        if (!bar) {
            return;
        }

        ['textTween', 'barTween', 'damageTween'].forEach(key => {
            if (bar[key]) {
                bar[key].stop();
                this.tweens.remove(bar[key]);
                bar[key] = null;
            }
        });
    }

    animateHealthBar(bar, targetHealth, maxHealth) {
        if (!bar) {
            return;
        }

        const clampedTarget = Phaser.Math.Clamp(targetHealth, 0, maxHealth);
        const previousHealth = typeof bar.displayedHealth === 'number' ? bar.displayedHealth : clampedTarget;
        const duration = 1000;

        const targetRatio = maxHealth > 0 ? Phaser.Math.Clamp(clampedTarget / maxHealth, 0, 1) : 0;
        const previousRatio = maxHealth > 0 ? Phaser.Math.Clamp(previousHealth / maxHealth, 0, 1) : 0;
        const targetWidth = bar.barWidth * targetRatio;
        const previousWidth = bar.barWidth * previousRatio;

        const isDamage = clampedTarget < previousHealth;

        this.stopHealthBarTweens(bar);

        bar.barFill.setFillStyle(bar.fillColor ?? bar.barFill.fillColor);

        if (typeof bar.damageFill !== 'undefined') {
            bar.damageFill.setVisible(false);
            bar.damageFill.displayWidth = 0;
        }

        if (typeof bar.displayedHealth !== 'number') {
            bar.barFill.displayWidth = targetWidth;
            bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
            bar.displayedHealth = clampedTarget;
            this.updateBurnUI();
            return;
        }

        if (previousHealth === clampedTarget) {
            bar.barFill.displayWidth = targetWidth;
            bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
            bar.displayedHealth = clampedTarget;
            this.updateBurnUI();
            return;
        }

        if (isDamage && bar.damageFill) {
            const differenceWidth = Math.max(0, previousWidth - targetWidth);
            bar.barFill.displayWidth = targetWidth;

            if (differenceWidth > 0) {
                bar.damageFill.setFillStyle(bar.damageColor ?? bar.damageFill.fillColor);
                bar.damageFill.x = bar.barFill.x + targetWidth;
                bar.damageFill.displayWidth = differenceWidth;
                bar.damageFill.displayHeight = bar.barHeight;
                bar.damageFill.setVisible(true);

                bar.damageTween = this.tweens.add({
                    targets: bar.damageFill,
                    displayWidth: 0,
                    duration,
                    ease: 'Linear',
                    onUpdate: () => {
                        bar.damageFill.x = bar.barFill.x + targetWidth;
                    },
                    onComplete: () => {
                        bar.damageFill.setVisible(false);
                        bar.damageFill.displayWidth = 0;
                    }
                });
            }
        } else {
            bar.barFill.displayWidth = previousWidth;
            bar.barTween = this.tweens.add({
                targets: bar.barFill,
                displayWidth: targetWidth,
                duration,
                ease: 'Linear'
            });
        }

        const textCounter = { value: previousHealth };
        bar.textTween = this.tweens.add({
            targets: textCounter,
            value: clampedTarget,
            duration,
            ease: 'Linear',
            onUpdate: () => {
                const displayValue = Math.round(textCounter.value);
                bar.displayedHealth = displayValue;
                bar.text.setText(`HP: ${displayValue}/${maxHealth}`);
                this.updateBurnUI();
            },
            onComplete: () => {
                bar.displayedHealth = clampedTarget;
                bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
                this.updateBurnUI();
            }
        });
    }

    processTurnOutcome({ attackScore, defendScore }) {
        if (!this.enemyManager) {
            return;
        }

        this.playerBlockValue = defendScore;

        this.applyBurnTickDamage();

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy) {
            this.handleAllEnemiesDefeated();
            this.playerBlockValue = 0;
            return;
        }

        this.enemyManager.primeUpcomingDefenses();
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
            this.stopHealthBarTweens(this.enemyHealthBar);
            this.enemyHealthBar.barFill.displayWidth = 0;
            this.enemyHealthBar.text.setText('HP: 0/0');
            if (this.enemyHealthBar.damageFill) {
                this.enemyHealthBar.damageFill.setVisible(false);
                this.enemyHealthBar.damageFill.displayWidth = 0;
            }
            this.enemyHealthBar.displayedHealth = 0;
            return;
        }

        this.animateHealthBar(this.enemyHealthBar, enemy.health, enemy.maxHealth);
    }

    prepareNextEnemyMove() {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            this.upcomingEnemyMove = null;
            if (this.enemyIntentText) {
                const hasPending = this.pathManager ? this.pathManager.hasPendingNodes() : false;
                this.enemyIntentText.setText(hasPending ? 'Select your next node' : 'All enemies defeated');
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

        for (const action of move.actions) {
            if (action.type === 'attack') {
                this.handleEnemyAttack(action.value);
            } else if (action.type === 'heal') {
                this.enemyManager.healCurrentEnemy(action.value);
                this.updateEnemyHealthUI();
            } else if (action.type === 'defend') {
                if (!action._preApplied) {
                    this.enemyManager.addEnemyBlock(action.value);
                }
            } else if (action.type === 'lock') {
                this.queueEnemyLocks(action.count || 1);
            } else if (action.type === 'burn') {
                this.applyPlayerBurn(action.value);
            }

            if (this.isGameOver) {
                break;
            }
        }

        if (this.isGameOver) {
            return;
        }

        this.playerBlockValue = 0;

        if (!this.enemyManager.isCurrentEnemyDefeated()) {
            this.prepareNextEnemyMove();
        } else {
            this.handleEnemyDefeat();
        }
    }

    applyPlayerBurn(amount) {
        if (amount <= 0) {
            return;
        }

        this.playerBurn += amount;
        this.updateBurnUI();
    }

    applyBurnTickDamage() {
        if (this.playerBurn <= 0) {
            return;
        }

        this.handleEnemyAttack(this.playerBurn);
    }

    updateBurnUI() {
        if (!this.playerBurnText || !this.healthBar || !this.healthBar.text) {
            return;
        }

        const shouldShowBurn = this.playerBurn > 0 && this.inCombat;

        if (shouldShowBurn) {
            const bounds = this.healthBar.text.getBounds();
            const burnX = bounds.x + bounds.width + 20;
            const burnY = bounds.y + bounds.height / 2;
            this.playerBurnText.setPosition(burnX, burnY);
            this.playerBurnText.setOrigin(0, 0.5);
            this.playerBurnText.setText(`Burn ${this.playerBurn}`);
            this.playerBurnText.setVisible(true);

            if (!this.playerBurnGlowTween) {
                this.playerBurnGlowTween = this.tweens.add({
                    targets: this.playerBurnText,
                    alpha: { from: 0.7, to: 1 },
                    duration: 800,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        } else {
            this.playerBurnText.setVisible(false);
            this.playerBurnText.setText('');

            if (this.playerBurnGlowTween) {
                this.playerBurnGlowTween.stop();
                this.playerBurnGlowTween.remove();
                this.playerBurnGlowTween = null;
            }

            this.playerBurnText.setAlpha(1);
            this.playerBurnText.setScale(1);
        }
    }

    resetPlayerBurn() {
        if (this.playerBurn !== 0) {
            this.playerBurn = 0;
        }
        this.updateBurnUI();
    }

    handleEnemyAttack(amount) {
        if (amount <= 0) {
            return;
        }

        const mitigated = Math.min(this.playerBlockValue, amount);
        this.playerBlockValue = Math.max(0, this.playerBlockValue - mitigated);
        const damage = Math.max(0, amount - mitigated);

        if (damage > 0) {
            this.applyDamage(damage);
        }
    }

    handlePathNodeSelection(node) {
        if (!node || !this.pathManager || this.inCombat || this.isResolving || this.isGameOver) {
            return;
        }

        this.pathManager.beginNode(node.id);
        this.currentPathNodeId = node.id;

        if (this.pathUI) {
            this.pathUI.updateState();
        }

        switch (node.type) {
            case PATH_NODE_TYPES.ENEMY:
                this.startCombatEncounter(node);
                break;
            case PATH_NODE_TYPES.SHOP:
                this.openShop();
                break;
            case PATH_NODE_TYPES.INFIRMARY:
                this.openInfirmary();
                break;
            default:
                this.pathManager.completeCurrentNode();
                this.currentPathNodeId = null;
                this.enterMapState();
                break;
        }
    }

    startCombatEncounter(node) {
        if (!this.enemyManager) {
            return;
        }

        this.inCombat = true;
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.resetGameState({ destroyDice: true });
        this.setMapMode(false);

        const enemy = this.enemyManager.startEnemyEncounter(node.enemyIndex);
        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            const baseName = enemy ? enemy.name : '???';
            const displayName = node.isBoss ? `${baseName} (Boss)` : baseName;
            this.enemyHealthBar.nameText.setText(displayName);
        }

        this.updateEnemyHealthUI();
        this.prepareNextEnemyMove();
        this.updateRollButtonState();

        if (this.resolveButton) {
            this.resolveButton.setAlpha(1);
            this.resolveButton.setInteractive();
        }

        if (this.sortButton) {
            this.sortButton.setAlpha(0.5);
            this.sortButton.disableInteractive();
        }

        const messageText = node.isBoss ? 'Boss Encounter!' : 'Battle Start';
        this.showNodeMessage(messageText, node.isBoss ? '#ff8c69' : '#ffffff');
    }

    openShop() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();

        this.activeFacilityUI = new ShopUI(this, {
            relics: this.getRelicShopState(),
            onPurchase: relicId => this.handleShopPurchase(relicId),
            onClose: () => this.closeShop()
        });
    }

    handleShopPurchase(relicId) {
        const relic = this.attemptPurchaseRelic(relicId);
        if (relic) {
            this.refreshShopInterface();
            return true;
        }
        return false;
    }

    refreshShopInterface() {
        if (this.activeFacilityUI instanceof ShopUI) {
            this.activeFacilityUI.updateRelics(this.getRelicShopState());
        }
    }

    getRelicShopState() {
        return this.relicCatalog.map(relic => ({
            id: relic.id,
            name: relic.name,
            description: relic.description,
            icon: relic.icon,
            cost: relic.cost,
            owned: this.ownedRelicIds.has(relic.id),
            canAfford: this.playerGold >= relic.cost
        }));
    }

    closeShop() {
        this.destroyFacilityUI();

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }
        this.enterMapState();
    }

    openInfirmary() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();

        const missing = Math.max(0, this.playerMaxHealth - this.playerHealth);
        const healFullCost = missing / 2 * 10;
        const canAffordFull = healFullCost > 0 && this.canAfford(healFullCost);

        this.activeFacilityUI = new InfirmaryUI(this, {
            healFullCost,
            canAffordFull,
            onHealHalf: () => this.handleInfirmaryChoice('half'),
            onIncreaseMax: () => this.handleInfirmaryChoice('max'),
            onHealFull: () => this.handleInfirmaryChoice('full')
        });
    }

    handleInfirmaryChoice(selection) {
        let message = '';
        let color = '#2ecc71';

        if (selection === 'half') {
            const missing = this.playerMaxHealth - this.playerHealth;
            const healAmount = Math.ceil(missing / 2);
            const healed = this.healPlayer(healAmount);
            message = healed > 0 ? `Recovered ${healed} HP` : 'Already at full health';
        } else if (selection === 'max') {
            const increased = this.increasePlayerMaxHealthByPercent(0.1, { heal: false });
            if (increased > 0) {
                message = `Max HP +${increased}`;
            } else {
                message = 'Max HP unchanged';
            }
        } else if (selection === 'full') {
            const missing = this.playerMaxHealth - this.playerHealth;
            if (missing <= 0) {
                message = 'Already at full health';
            } else {
                const cost = missing / 2 * 10;
                if (cost > 0 && this.canAfford(cost)) {
                    const spent = this.spendGold(cost);
                    if (spent > 0) {
                        this.healPlayer(missing);
                        message = `Fully restored! (-${spent}g)`;
                        color = '#f1c40f';
                    }
                } else {
                    message = 'Not enough gold';
                    color = '#e74c3c';
                }
            }
        }

        this.destroyFacilityUI();

        if (message) {
            this.showNodeMessage(message, color);
        }

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }
        this.enterMapState();
    }

    destroyFacilityUI() {
        if (this.activeFacilityUI && typeof this.activeFacilityUI.destroy === 'function') {
            this.activeFacilityUI.destroy();
        }
        this.activeFacilityUI = null;
    }

    enterMapState() {
        const hasPendingNodes = this.pathManager ? this.pathManager.hasPendingNodes() : false;

        this.destroyFacilityUI();

        this.inCombat = false;
        this.updateRollButtonState();

        if (this.sortButton) {
            this.sortButton.disableInteractive();
            this.sortButton.setAlpha(0.3);
        }

        if (this.resolveButton) {
            this.resolveButton.disableInteractive();
            this.resolveButton.setAlpha(0.3);
        }

        if (!hasPendingNodes) {
            if (this.pathUI) {
                this.pathUI.hide();
            }
            this.setMapMode(false);
            this.handleAllEnemiesDefeated();
            return;
        }

        this.setMapMode(true);

        if (this.pathUI) {
            this.pathUI.show();
            this.pathUI.updateState();
        }
    }

    healPlayer(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        const newHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
        const healed = newHealth - this.playerHealth;
        if (healed > 0) {
            this.playerHealth = newHealth;
            this.updateHealthUI();
        }
        return healed;
    }

    increasePlayerMaxHealth(amount, { heal = true } = {}) {
        if (!amount || amount <= 0) {
            return 0;
        }

        this.playerMaxHealth += amount;
        if (heal) {
            this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
        } else {
            this.playerHealth = Math.min(this.playerHealth, this.playerMaxHealth);
        }
        this.updateHealthUI();
        return amount;
    }

    increasePlayerMaxHealthByPercent(percent, { heal = false } = {}) {
        if (!percent || typeof percent !== 'number') {
            return 0;
        }

        const increase = Math.max(1, Math.round(this.playerMaxHealth * percent));
        this.increasePlayerMaxHealth(increase, { heal });
        return increase;
    }

    addGold(amount) {
        if (!amount || amount === 0) {
            return 0;
        }

        this.playerGold += amount;
        this.updateGoldUI();
        return amount;
    }

    spendGold(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        if (this.playerGold < amount) {
            return 0;
        }

        this.playerGold -= amount;
        this.updateGoldUI();
        return amount;
    }

    canAfford(amount) {
        return typeof amount === 'number' && amount > 0 && this.playerGold >= amount;
    }

    updateGoldUI() {
        if (!this.goldText) {
            return;
        }

        this.goldText.setText(`Gold: ${this.playerGold}`);
    }

    attemptPurchaseRelic(relicId) {
        const relic = this.relicCatalog.find(item => item.id === relicId);
        if (!relic || this.ownedRelicIds.has(relic.id)) {
            return false;
        }

        if (!this.canAfford(relic.cost)) {
            return false;
        }

        const spent = this.spendGold(relic.cost);
        if (spent <= 0) {
            return false;
        }

        this.ownedRelicIds.add(relic.id);
        this.relics.push(relic);
        if (typeof relic.apply === 'function') {
            relic.apply(this);
        }
        this.updateRelicDisplay();
        this.showRelicDetails(relic);
        return relic;
    }

    showNodeMessage(message, color = '#ffffff') {
        if (!message) {
            return;
        }

        if (this.nodeMessageTween) {
            this.nodeMessageTween.stop();
            this.tweens.remove(this.nodeMessageTween);
            this.nodeMessageTween = null;
        }

        if (this.nodeMessage) {
            this.nodeMessage.destroy();
            this.nodeMessage = null;
        }

        this.nodeMessage = this.add.text(this.scale.width / 2, 110, message, {
            fontSize: '26px',
            color,
            fontStyle: 'bold',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(30);

        this.nodeMessageTween = this.tweens.add({
            targets: this.nodeMessage,
            alpha: 0,
            duration: 1000,
            delay: 1200,
            onComplete: () => {
                if (this.nodeMessage) {
                    this.nodeMessage.destroy();
                    this.nodeMessage = null;
                }
                this.nodeMessageTween = null;
            }
        });
    }

    handleEnemyDefeat() {
        if (!this.enemyManager) {
            return;
        }

        const defeatedNodeId = this.currentPathNodeId;
        const defeatedNode = this.pathManager && defeatedNodeId
            ? this.pathManager.getNode(defeatedNodeId)
            : null;
        if (defeatedNode && defeatedNode.rewardGold) {
            const reward = this.addGold(defeatedNode.rewardGold);
            if (reward > 0) {
                this.showNodeMessage(`+${reward} Gold`, '#f1c40f');
            }
        }

        this.resetPlayerBurn();

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }

        this.currentPathNodeId = null;

        if (this.pathUI) {
            this.pathUI.updateState();
        }

        this.enemyManager.clearCurrentEnemy();
        this.updateEnemyHealthUI();
        this.enterMapState();
    }

    handleAllEnemiesDefeated() {
        this.upcomingEnemyMove = null;

        this.resetPlayerBurn();

        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            this.enemyHealthBar.nameText.setText('All Enemies Defeated');
        }

        if (this.enemyIntentText) {
            this.enemyIntentText.setText('All enemies defeated');
        }

        this.updateEnemyHealthUI();

        if (this.pathUI) {
            this.pathUI.hide();
        }
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
        if (this.comboTextGroup) {
            this.comboTextGroup.forEach(t => t.setColor("#ffffff"));
        }
    }

    setMapMode(isMapView) {
        const showCombatUI = !isMapView;
        const setVisibility = (obj, visible) => {
            if (obj && typeof obj.setVisible === 'function') {
                obj.setVisible(visible);
            }
        };

        const applyToArray = (arr, visible) => {
            if (!arr || typeof arr.forEach !== 'function') {
                return;
            }
            arr.forEach(item => setVisibility(item, visible));
        };

        setVisibility(this.rollButton, showCombatUI);
        if (this.rollButton) {
            if (showCombatUI) {
                this.updateRollButtonState();
            } else {
                this.rollButton.disableInteractive();
            }
        }

        setVisibility(this.sortButton, showCombatUI);
        if (this.sortButton && !showCombatUI) {
            this.sortButton.disableInteractive();
        }

        setVisibility(this.resolveButton, showCombatUI);
        if (this.resolveButton && !showCombatUI) {
            this.resolveButton.disableInteractive();
        }

        setVisibility(this.rollsRemainingText, showCombatUI);

        if (this.muteButton) {
            setVisibility(this.muteButton, showCombatUI);
            if (showCombatUI) {
                this.muteButton.setInteractive({ useHandCursor: true });
            } else {
                this.muteButton.disableInteractive();
            }
        }

        setVisibility(this.playerBurnText, showCombatUI && this.playerBurn > 0 && this.inCombat);

        applyToArray(this.zoneVisuals, showCombatUI);

        if (this.defendHighlight) {
            this.defendHighlight.setVisible(false);
        }
        if (this.attackHighlight) {
            this.attackHighlight.setVisible(false);
        }

        applyToArray(this.comboTextGroup, showCombatUI);
        setVisibility(this.comboHeaderText, showCombatUI);
        applyToArray(this.relicVisuals, showCombatUI);
        setVisibility(this.relicInfoText, showCombatUI);
        if (Array.isArray(this.relicInteractiveAreas)) {
            this.relicInteractiveAreas.forEach(area => {
                if (!area) {
                    return;
                }
                if (area.bg) {
                    if (showCombatUI) {
                        area.bg.setInteractive({ useHandCursor: true });
                    } else {
                        area.bg.disableInteractive();
                    }
                }
                if (area.icon) {
                    if (showCombatUI) {
                        area.icon.setInteractive({ useHandCursor: true });
                    } else {
                        area.icon.disableInteractive();
                    }
                }
            });
        }
        setVisibility(this.defendText, showCombatUI);
        setVisibility(this.attackText, showCombatUI);

        if (this.enemyHealthBar) {
            const elements = ['barBg', 'barFill', 'text', 'nameText', 'intentText'];
            elements.forEach(key => {
                const element = this.enemyHealthBar[key];
                if (element) {
                    setVisibility(element, showCombatUI);
                }
            });
        }
    }
    
    updateRollButtonState() {
        if (!this.rollButton) {
            return;
        }

        if (!this.inCombat || this.isGameOver) {
            this.rollButton.setAlpha(0.5);
            this.rollButton.disableInteractive();
            return;
        }

        if (this.isGameOver) {
            this.rollButton.setAlpha(0.5);
            this.rollButton.disableInteractive();
            return;
        }

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
        const anySelected = this.getDiceInPlay().some(d => d.selected);
        if (anySelected) {
            this.rollButton.setAlpha(1);
            this.rollButton.setInteractive();
        } else {
            this.rollButton.setAlpha(0.5);
            this.rollButton.disableInteractive();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.sound.mute = this.isMuted;
        this.updateMuteButtonState();
    }

    updateMuteButtonState() {
        if (!this.muteButton) {
            return;
        }

        const icon = this.isMuted ? '🔇' : '🔊';
        this.muteButton.setText(icon);
    }

    triggerGameOver() {
        if (this.isGameOver) {
            return;
        }

        this.isGameOver = true;

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

        this.getDiceInPlay().forEach(die => die.disableInteractive());

        if (this.gameOverManager) {
            this.gameOverManager.show(() => this.restartGame());
        }
    }

    restartGame() {
        if (this.gameOverManager) {
            this.gameOverManager.hide();
        }

        this.scene.restart({ isMuted: this.isMuted });
    }
}
