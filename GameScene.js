import { CONSTANTS } from './config.js';
import { createDie } from './objects/Dice.js';
import { setupZones } from './objects/DiceZone.js';
import { setupButtons, setupHealthBar } from './objects/UI.js';
import { displayComboTable, evaluateCombo, scoreCombo } from './systems/ComboSystem.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Game state
        this.dice = [];
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.playerMaxHealth = 100;
        this.playerHealth = this.playerMaxHealth;
        this.healthBar = null;
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
        if (this.rollsRemaining === CONSTANTS.DEFAULT_MAX_ROLLS || diceSelectedCount === 6) { // TODO replace 6 with const
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
        if (this.rollsRemaining === CONSTANTS.DEFAULT_MAX_ROLLS) {
            this.dice = [];
            for (let i = 0; i < 6; i++) {
                const die = createDie(this, i);
                this.dice.push(die);
            }
        }

        // Roll dice (first roll = all dice, later rolls = only selected dice)
        this.dice.forEach(d => {
            if (this.rollsRemaining === CONSTANTS.DEFAULT_MAX_ROLLS || d.selected) {
                d.roll();
                d.selected = false;
                d.bg.fillColor = 0x444444;
            }
        });



        // Decrement rolls remaining
        this.rollsRemaining--;
        this.rollsRemainingText.setText(this.rollsRemaining);

        this.updateRollButtonState();

        // Enable sort button after the first roll
        this.sortButton.setAlpha(1);
        this.sortButton.setInteractive();
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
        // Play resolve sound effect
        this.sound.play('chimeShort', { volume: 0.7 });
        this.sound.play('chimeLong', {
            volume: 0.4,
            seek: 1.5,     // start 0.5s into the clip
            duration: 1, // play for 1 second
            rate: 3      // 1.0 = normal speed, >1 = faster, <1 = slower
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

        this.applyDamage(10);

        // Reset game state
        this.resetGameState();
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

    resetGameState() {
        // Remove all dice
        [...this.defendDice, ...this.attackDice, ...this.dice].forEach(d => d.destroy());
        this.dice = [];
        this.defendDice = [];
        this.attackDice = [];
        this.defendSlots = Array(6).fill(null);
        this.attackSlots = Array(6).fill(null);

        // Reset roll counter
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.rollsRemainingText.setText(CONSTANTS.DEFAULT_MAX_ROLLS);

        // Enable roll button, disable sort button
        this.rollButton.setAlpha(1);
        this.rollButton.setInteractive();
        this.sortButton.setAlpha(0.5);
        this.sortButton.disableInteractive();

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
