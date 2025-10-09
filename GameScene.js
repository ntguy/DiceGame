import { CONSTANTS } from './config.js';
import { createDie } from './objects/Dice.js';
import { setupZones } from './objects/DiceZone.js';
import { setupButtons, setupHealthBar, setupEnemyUI, setupMuteButton } from './objects/UI.js';
import { displayComboTable, evaluateCombo, scoreCombo } from './systems/ComboSystem.js';
import { EnemyManager } from './systems/EnemySystem.js';
import { GameOverManager } from './systems/GameOverSystem.js';
import { PathManager, PATH_NODE_TYPES } from './systems/PathManager.js';
import { PathUI } from './objects/PathUI.js';

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
    }

    init(data) {
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

        if (this.playerHealth === 0) {
            this.triggerGameOver();
        }
    }

    updateHealthUI() {
        if (!this.healthBar) {
            return;
        }

        const healthRatio = Phaser.Math.Clamp(this.playerHealth / this.playerMaxHealth, 0, 1);
        this.healthBar.barFill.displayWidth = this.healthBar.barWidth * healthRatio;
        this.healthBar.text.setText(`HP: ${this.playerHealth}/${this.playerMaxHealth}`);
        this.updateBurnUI();
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
            this.enemyHealthBar.text.setText('HP: --/--');
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
                this.enemyManager.addEnemyBlock(action.value);
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
        const damage = Math.max(0, amount - mitigated);
        this.playerBlockValue = Math.max(0, this.playerBlockValue - amount);

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
                this.resolveShopNode(node);
                break;
            case PATH_NODE_TYPES.MEDICAL:
                this.resolveMedicalNode(node);
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

    resolveShopNode(node) {
        const cost = 100;
        const spent = this.spendGold(cost);
        this.showNodeMessage(`-${spent} Gold`, '#f1c40f');

        this.pathManager.completeCurrentNode();
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }
        this.enterMapState();
    }

    resolveMedicalNode(node) {
        const missing = this.playerMaxHealth - this.playerHealth;
        const healAmount = Math.floor(missing / 2);
        const healed = this.healPlayer(healAmount);

        if (healed > 0) {
            this.showNodeMessage(`Recovered ${healed} HP`, '#2ecc71');
        } else {
            this.showNodeMessage('Already at full health', '#2ecc71');
        }

        this.pathManager.completeCurrentNode();
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }
        this.enterMapState();
    }

    enterMapState() {
        const hasPendingNodes = this.pathManager ? this.pathManager.hasPendingNodes() : false;

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

        this.playerGold -= amount;
        this.updateGoldUI();
        return amount;
    }

    updateGoldUI() {
        if (!this.goldText) {
            return;
        }

        this.goldText.setText(`Gold: ${this.playerGold}`);
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
