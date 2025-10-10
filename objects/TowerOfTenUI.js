import { createModal, destroyModal } from './ui/ModalComponents.js';
import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

const PANEL_WIDTH = 960;
const PANEL_HEIGHT = 540;
const TOWER_SEGMENTS = 10;
const SEGMENT_WIDTH = 140;
const SEGMENT_HEIGHT = 34;
const SEGMENT_SPACING = 8;
const BASE_SEGMENT_COLOR = 0xecf0f1;
const BASE_SEGMENT_ALPHA = 0.92;
const BASE_LABEL_COLOR = '#1a252f';
const FILLED_SEGMENT_COLOR = 0xf7dc6f;
const FILLED_LABEL_COLOR = '#1f2f38';
const SEGMENT_STROKE_COLOR = 0x34495e;
const SLOT_FILL_COLOR = 0x132731;
const SLOT_STROKE_COLOR = 0x85c1e9;
const SLOT_SELECTED_STROKE = 0xf7dc6f;

export class TowerOfTenUI {
    constructor(scene, { onComplete } = {}) {
        this.scene = scene;
        this.onComplete = typeof onComplete === 'function' ? onComplete : () => {};

        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.towerSegments = [];
        this.diceSlotsContainer = null;
        this.diceSlots = [];
        this.twoDiceButton = null;
        this.threeDiceButton = null;
        this.rollButton = null;
        this.rerollButton = null;
        this.cashOutButton = null;
        this.leaveButton = null;
        this.resultText = null;
        this.payoutText = null;

        this.diceCount = 2;
        this.diceValues = [];
        this.selectedForReroll = new Set();
        this.hasRolled = false;
        this.hasRerolled = false;
        this.isDestroyed = false;
        this.isFinishing = false;

        this.create();
    }

    create() {
        const modal = createModal(this.scene, {
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
            panelColor: 0x0d1c24,
            panelAlpha: 0.97,
            strokeColor: 0xf7dc6f,
            strokeAlpha: 0.9,
            title: 'Tower of Ten',
            titleStyle: {
                fontSize: '42px',
                color: '#f7dc6f',
                fontStyle: 'bold'
            },
            subtitle: 'Press your luck for a golden payout',
            subtitleStyle: {
                fontSize: '22px',
                color: '#d5f5f9'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.createTowerDisplay();
        this.createDiceArea();
        this.createInstructionsPanel();

        this.setDiceCount(2);
        this.updateButtonStates();
        this.updateTowerFill(0);
        this.updateResultText();
    }

    createTowerDisplay() {
        const towerX = -PANEL_WIDTH / 2 + 160;
        const totalHeight = TOWER_SEGMENTS * SEGMENT_HEIGHT + (TOWER_SEGMENTS - 1) * SEGMENT_SPACING;
        const topY = -totalHeight / 2 + SEGMENT_HEIGHT / 2;

        const title = this.scene.add.text(towerX, -PANEL_HEIGHT / 2 + 120, 'Tower Levels', {
            fontSize: '26px',
            color: '#f7dc6f',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.container.add(title);

        this.towerSegments = [];
        for (let level = TOWER_SEGMENTS; level >= 1; level -= 1) {
            const indexFromTop = TOWER_SEGMENTS - level;
            const y = topY + indexFromTop * (SEGMENT_HEIGHT + SEGMENT_SPACING);

            const rect = this.scene.add.rectangle(towerX, y, SEGMENT_WIDTH, SEGMENT_HEIGHT, BASE_SEGMENT_COLOR, BASE_SEGMENT_ALPHA)
                .setStrokeStyle(2, SEGMENT_STROKE_COLOR, 0.85);

            const label = this.scene.add.text(towerX, y, level.toString(), {
                fontSize: '20px',
                color: BASE_LABEL_COLOR,
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.container.add(rect);
            this.container.add(label);

            this.towerSegments[level - 1] = { rect, label };
        }
    }

    createDiceArea() {
        const areaX = -PANEL_WIDTH / 2 + 400;
        const controlsY = -PANEL_HEIGHT / 2 + 110;

        const header = this.scene.add.text(areaX, controlsY - 46, 'Choose Your Dice', {
            fontSize: '26px',
            color: '#d6f5ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(header);

        this.twoDiceButton = this.createTextButton(areaX - 70, controlsY, '2 Dice', () => this.setDiceCount(2));
        this.threeDiceButton = this.createTextButton(areaX + 70, controlsY, '3 Dice', () => this.setDiceCount(3));

        this.diceSlotsContainer = this.scene.add.container(areaX, controlsY + 140);
        this.container.add(this.diceSlotsContainer);

        this.resultText = this.scene.add.text(areaX, controlsY + 238, 'Roll to climb the tower', {
            fontSize: '26px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.container.add(this.resultText);

        this.payoutText = this.scene.add.text(areaX, controlsY + 278, '', {
            fontSize: '20px',
            color: '#f7dc6f'
        }).setOrigin(0.5);
        this.container.add(this.payoutText);

        const actionsY = PANEL_HEIGHT / 2 - 120;
        this.rollButton = this.createTextButton(areaX - 150, actionsY, 'Roll Dice', () => this.rollDice());
        this.rerollButton = this.createTextButton(areaX, actionsY, 'Reroll Selected', () => this.handleReroll());
        this.cashOutButton = this.createTextButton(areaX + 150, actionsY, 'Cash Out', () => this.cashOut());
        this.leaveButton = this.createTextButton(areaX, actionsY + 70, 'Leave Tower', () => this.leave(), {
            baseColor: '#4a5a68',
            textColor: '#ecf0f1'
        });
    }

    createInstructionsPanel() {
        const panelX = PANEL_WIDTH / 2 - 170;
        const panelHeight = PANEL_HEIGHT - 140;
        const panel = this.scene.add.rectangle(panelX, 10, 280, panelHeight, 0x11242f, 0.9)
            .setStrokeStyle(2, 0xf7dc6f, 0.75);
        const title = this.scene.add.text(panelX, -panelHeight / 2 + 28, 'How it Works', {
            fontSize: '26px',
            color: '#f7dc6f',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);

        const instructions = [
            '• Pick 2 or 3 dice before rolling.',
            '• Roll once to light the tower.',
            '• Select dice and reroll once (optional).',
            '• Cash out anytime after a roll.',
            'Payouts:',
            '  1-5  → total ×10 gold',
            '  6-8  → total ×20 gold',
            '  9-10 → total ×30 gold',
            '  11+  → Bust! no gold'
        ].join('\n');

        const text = this.scene.add.text(panelX - 120, title.y + 48, instructions, {
            fontSize: '18px',
            color: '#e8f8ff',
            lineSpacing: 6
        }).setOrigin(0, 0);

        this.container.add(panel);
        this.container.add(title);
        this.container.add(text);
    }

    createTextButton(x, y, label, handler, styleOverrides = {}) {
        const button = this.scene.add.text(x, y, label, {
            fontSize: '20px',
            color: styleOverrides.textColor || '#eaf2f8',
            padding: { x: 28, y: 12 },
            align: 'center'
        }).setOrigin(0.5);

        applyTextButtonStyle(button, {
            baseColor: styleOverrides.baseColor || '#1c3c4a',
            textColor: styleOverrides.textColor || '#eaf2f8',
            hoverBlend: 0.18,
            pressBlend: 0.28,
            disabledBlend: 0.3,
            enabledAlpha: 1,
            disabledAlpha: 0.5
        });
        setTextButtonEnabled(button, true);

        button.on('pointerup', handler);
        this.container.add(button);
        return button;
    }

    setDiceCount(count) {
        if (count !== 2 && count !== 3) {
            return;
        }

        this.diceCount = count;
        this.diceValues = new Array(count).fill(null);
        this.selectedForReroll.clear();
        this.hasRolled = false;
        this.hasRerolled = false;

        this.renderDiceSlots();
        this.updateDiceCountButtons();
        this.updateButtonStates();
        this.updateDiceDisplay();
        this.updateTowerFill(0);
        this.updateResultText();
    }

    updateDiceCountButtons() {
        this.styleDiceCountButton(this.twoDiceButton, this.diceCount === 2);
        this.styleDiceCountButton(this.threeDiceButton, this.diceCount === 3);
    }

    styleDiceCountButton(button, active) {
        if (!button) {
            return;
        }
        const state = button.getData && button.getData('textButtonStyle');
        if (!state) {
            return;
        }

        if (active) {
            button.disableInteractive();
            button.setStyle({ backgroundColor: '#f7dc6f', color: '#102129' });
            button.setAlpha(1);
        } else {
            button.setStyle({ backgroundColor: state.baseColor, color: '#eaf2f8' });
            button.setAlpha(state.enabledAlpha);
            button.setInteractive({ useHandCursor: true });
        }
    }

    renderDiceSlots() {
        if (!this.diceSlotsContainer) {
            return;
        }
        this.diceSlotsContainer.removeAll(true);
        this.diceSlots = [];

        const spacing = 120;
        const startX = -(this.diceCount - 1) * spacing / 2;

        for (let i = 0; i < this.diceCount; i += 1) {
            const slotContainer = this.scene.add.container(startX + i * spacing, 0);
            const background = this.scene.add.rectangle(0, 0, 96, 96, SLOT_FILL_COLOR, 0.95)
                .setStrokeStyle(2, SLOT_STROKE_COLOR, 0.85);
            background.disableInteractive();
            background.on('pointerup', () => this.toggleDieSelection(i));

            const valueText = this.scene.add.text(0, -6, '?', {
                fontSize: '40px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const hintText = this.scene.add.text(0, 32, 'select to reroll', {
                fontSize: '13px',
                color: '#82e0aa'
            }).setOrigin(0.5);
            hintText.setVisible(false);

            slotContainer.add(background);
            slotContainer.add(valueText);
            slotContainer.add(hintText);
            this.diceSlotsContainer.add(slotContainer);

            this.diceSlots.push({ background, valueText, hintText });
        }
    }

    toggleDieSelection(index) {
        if (!this.hasRolled || this.hasRerolled) {
            return;
        }
        if (!this.selectedForReroll.has(index)) {
            this.selectedForReroll.add(index);
        } else {
            this.selectedForReroll.delete(index);
        }
        this.updateDiceDisplay();
    }

    rollDice() {
        if (this.hasRolled) {
            return;
        }
        this.diceValues = this.diceValues.map(() => Phaser.Math.Between(1, 6));
        this.hasRolled = true;
        this.selectedForReroll.clear();
        this.playRollSound();
        this.updateDiceDisplay();
        const total = this.getCurrentTotal();
        this.updateTowerFill(total);
        this.updateResultText();
        this.updateButtonStates();
    }

    handleReroll() {
        if (!this.hasRolled || this.hasRerolled) {
            return;
        }

        const indices = this.selectedForReroll.size > 0
            ? Array.from(this.selectedForReroll)
            : this.diceValues.map((_, index) => index);

        indices.forEach(index => {
            this.diceValues[index] = Phaser.Math.Between(1, 6);
        });

        this.hasRerolled = true;
        this.selectedForReroll.clear();
        this.playRollSound();
        this.updateDiceDisplay();
        const total = this.getCurrentTotal();
        this.updateTowerFill(total);
        this.updateResultText();
        this.updateButtonStates();
    }

    cashOut() {
        if (!this.hasRolled) {
            return;
        }

        const total = this.getCurrentTotal();
        const reward = this.calculateReward(total);
        this.finish({
            reward,
            total,
            bust: total > TOWER_SEGMENTS,
            didReroll: this.hasRerolled,
            abandoned: false
        });
    }

    leave() {
        const total = this.hasRolled ? this.getCurrentTotal() : 0;
        this.finish({
            reward: 0,
            total,
            bust: this.hasRolled ? total > TOWER_SEGMENTS : false,
            didReroll: this.hasRerolled,
            abandoned: true
        });
    }

    updateDiceDisplay() {
        this.diceSlots.forEach((slot, index) => {
            const value = this.diceValues[index];
            const hasValue = typeof value === 'number';
            slot.valueText.setText(hasValue ? value.toString() : '?');
            const rerollActive = this.hasRolled && !this.hasRerolled;
            if (rerollActive) {
                slot.background.setInteractive({ useHandCursor: true });
            } else {
                slot.background.disableInteractive();
            }
            slot.hintText.setVisible(rerollActive);

            const isSelected = this.selectedForReroll.has(index) && rerollActive;
            if (isSelected) {
                slot.background.setStrokeStyle(3, SLOT_SELECTED_STROKE, 0.95);
                slot.background.setFillStyle(0x1d3a47, 0.98);
            } else {
                slot.background.setStrokeStyle(2, SLOT_STROKE_COLOR, 0.85);
                slot.background.setFillStyle(SLOT_FILL_COLOR, 0.95);
            }
        });
    }

    updateTowerFill(total) {
        if (!Array.isArray(this.towerSegments)) {
            return;
        }

        if (total <= TOWER_SEGMENTS) {
            this.towerSegments.forEach((segment, index) => {
                if (!segment) {
                    return;
                }
                const level = index + 1;
                if (total >= level && total > 0) {
                    segment.rect.setFillStyle(FILLED_SEGMENT_COLOR, 0.96);
                    segment.label.setColor(FILLED_LABEL_COLOR);
                } else {
                    segment.rect.setFillStyle(BASE_SEGMENT_COLOR, BASE_SEGMENT_ALPHA);
                    segment.label.setColor(BASE_LABEL_COLOR);
                }
            });
        } else {
            this.towerSegments.forEach(segment => {
                if (!segment) {
                    return;
                }
                segment.rect.setFillStyle(BASE_SEGMENT_COLOR, 0.65);
                segment.label.setColor('#7f8c8d');
            });
        }
    }

    updateResultText() {
        if (!this.resultText || !this.payoutText) {
            return;
        }

        if (!this.hasRolled) {
            this.resultText.setText('Roll to climb the tower');
            this.payoutText.setText('');
            return;
        }

        const total = this.getCurrentTotal();
        const reward = this.calculateReward(total);

        this.resultText.setText(`Total: ${total}`);
        if (reward > 0) {
            this.payoutText.setText(`Payout: ${reward} gold`);
            this.payoutText.setColor('#f7dc6f');
        } else if (total > TOWER_SEGMENTS) {
            this.payoutText.setText('Bust! Totals above 10 earn nothing.');
            this.payoutText.setColor('#ff8e8e');
        } else {
            this.payoutText.setText('No payout yet. Reroll or cash out.');
            this.payoutText.setColor('#d5f5f9');
        }
    }

    updateButtonStates() {
        setTextButtonEnabled(this.rollButton, !this.hasRolled);
        setTextButtonEnabled(this.rerollButton, this.hasRolled && !this.hasRerolled);
        setTextButtonEnabled(this.cashOutButton, this.hasRolled);
        if (this.leaveButton) {
            setTextButtonEnabled(this.leaveButton, true);
        }
    }

    getCurrentTotal() {
        return this.diceValues.reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
    }

    calculateReward(total) {
        if (total <= 0) {
            return 0;
        }
        if (total >= 1 && total <= 5) {
            return total * 10;
        }
        if (total >= 6 && total <= 8) {
            return total * 20;
        }
        if (total === 9 || total === 10) {
            return total * 30;
        }
        return 0;
    }

    playRollSound() {
        if (this.scene && this.scene.sound) {
            this.scene.sound.play('multiDiceRoll', { volume: 0.45 });
        }
    }

    finish(result) {
        if (this.isFinishing) {
            return;
        }
        this.isFinishing = true;
        this.destroy();
        this.onComplete(result || {});
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;
        destroyModal(this.modal);
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.diceSlots = [];
        this.towerSegments = [];
        this.diceSlotsContainer = null;
    }
}
