import { createModal, destroyModal } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle, setRectangleButtonEnabled } from './ui/ButtonStyles.js';
import { createDieFace, setDieBackgroundFill } from './ui/DieFace.js';

const PANEL_WIDTH = 820;
const PANEL_HEIGHT = 550;
const INSTRUCTIONS_WIDTH = 280;
const DICE_SIZE = 80;
const DICE_SPACING = 100;
const TOWER_STEP_COUNT = 11;
const TOWER_STEP_SIZE = 40;
const TOWER_STEP_SPACING = 2;

const COLORS = {
    diceBase: 0x444444,
    diceSelected: 0x2ecc71,
    diceText: '#f8fbff',
    towerBase: 0xecf0f1,
    towerHighlight: 0xf7c873,
    instructionsBg: 0x0b1f31,
    instructionsStroke: 0x5dade2,
    button: 0x1c3a4d,
    buttonStroke: 0x5dade2,
    statusInfo: '#aed6f1',
    statusWarning: '#f5b041',
    rewardBronze: '#cd7f32',
    rewardSilver: '#d5d8dc',
    rewardGold: '#f9e79f',
    rewardBust: '#ff7675',
    towerBustFill: 0x000000
};

const TOWER_REWARD_INFO = {
    1: { text: '10', color: COLORS.rewardBronze },
    2: { text: '20', color: COLORS.rewardBronze },
    3: { text: '30', color: COLORS.rewardBronze },
    4: { text: '40', color: COLORS.rewardBronze },
    5: { text: '50', color: COLORS.rewardBronze },
    6: { text: '120', color: COLORS.rewardSilver },
    7: { text: '140', color: COLORS.rewardSilver },
    8: { text: '160', color: COLORS.rewardSilver },
    9: { text: '270', color: COLORS.rewardGold },
    10: { text: '300', color: COLORS.rewardGold },
    11: { text: '💥', color: COLORS.rewardBust }
};

function rollDie() {
    return Phaser.Math.Between(1, 6);
}

function calculatePayout(total) {
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

export class TowerOfTenUI {
    constructor(scene, { onComplete } = {}) {
        this.scene = scene;
        this.onComplete = typeof onComplete === 'function' ? onComplete : () => {};

        this.isDestroyed = false;
        this.diceCount = 3;
        this.diceValues = new Array(this.diceCount).fill(null);
        this.diceSelected = new Array(this.diceCount).fill(true);
        this.hasRolled = false;
        this.rerollUsed = false;

        this.diceSlots = [];
        this.towerSteps = [];

        this.create();
    }

    create() {
        const modal = createModal(this.scene, {
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
            panelColor: 0x08131d,
            panelAlpha: 0.96,
            strokeColor: 0x5dade2,
            strokeAlpha: 0.95,
            title: 'Tower of Ten',
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.createDiceCountButtons();
        this.createTowerDisplay();
        this.createDiceDisplay();
        this.createStatusTexts();
        this.createControlButtons();
        this.createInstructionPanel();

        this.updateDiceCountSelection();
        this.updateTowerFill();
        this.updateDiceDisplay();
        this.updateOutcomeText();
        this.updateButtonState();
        this.updateRollButtonLabel();
    }

    createDiceCountButtons() {
        this.diceCountButtons = [];
        const topY = -PANEL_HEIGHT / 2 + 150;
        const configs = [
            { count: 2, label: '2 Dice', x: -150 },
            { count: 3, label: '3 Dice', x: -50 }
        ];

        configs.forEach(({ count, label, x }) => {
            const container = this.scene.add.container(x, topY);
            const background = this.scene.add.rectangle(0, 0, 100, 52, COLORS.button, 0.92)
                .setStrokeStyle(2, COLORS.buttonStroke, 0.9)
                .setInteractive({ useHandCursor: true });

            applyRectangleButtonStyle(background, {
                baseColor: COLORS.button,
                baseAlpha: 0.92,
                hoverBlend: 0.16,
                pressBlend: 0.28,
                disabledBlend: 0.45,
                enabledAlpha: 1,
                disabledAlpha: 0.4
            });

            background.on('pointerup', () => {
                this.setDiceCount(count);
            });

            const text = this.scene.add.text(0, 0, label, {
                fontSize: '18px',
                color: '#eaf2f8'
            }).setOrigin(0.5);

            container.add([background, text]);
            this.container.add(container);
            this.diceCountButtons.push({ container, background, text, count });
        });
    }

    hideDiceCountButtons() {
        if (!this.diceCountButtons) {
            return;
        }
        this.diceCountButtons.forEach(({ container, background }) => {
            container.setVisible(false);
            background.disableInteractive();
        });
    }

    createTowerDisplay() {
        const towerX = -PANEL_WIDTH / 2 + 100;
        const towerContainer = this.scene.add.container(towerX, 20);
        const totalHeight = TOWER_STEP_COUNT * TOWER_STEP_SIZE + (TOWER_STEP_COUNT - 1) * TOWER_STEP_SPACING;

        for (let i = 0; i < TOWER_STEP_COUNT; i += 1) {
            const level = TOWER_STEP_COUNT - i;
            const y = -totalHeight / 2 + i * (TOWER_STEP_SIZE + TOWER_STEP_SPACING) + TOWER_STEP_SIZE / 2;
            const stepRect = this.scene.add.rectangle(0, y, TOWER_STEP_SIZE, TOWER_STEP_SIZE, COLORS.towerBase, 0.7)
                .setStrokeStyle(2, COLORS.buttonStroke, 0.6);
            const labelText = level === 11 ? '11+' : `${level}`;
            const label = this.scene.add.text(0, y, labelText, {
                fontSize: '18px',
                color: '#0b1a2b'
            }).setOrigin(0.5);

            const rewardInfo = TOWER_REWARD_INFO[level] || { text: '', color: '#ffffff' };
            const rewardLabel = this.scene.add.text(-(TOWER_STEP_SIZE / 2) - 12, y, rewardInfo.text, {
                fontSize: '16px',
                color: rewardInfo.color
            }).setOrigin(1, 0.5);

            towerContainer.add(stepRect);
            towerContainer.add(label);
            towerContainer.add(rewardLabel);
            this.towerSteps.push({ level, rect: stepRect, label, rewardLabel, rewardColor: rewardInfo.color });
        }

        this.container.add(towerContainer);
    }

    createDiceDisplay() {
        this.diceContainer = this.scene.add.container(-100, 0);
        this.container.add(this.diceContainer);
    }

    createStatusTexts() {
        const totalY = PANEL_HEIGHT / 2 - 180;
        this.totalText = this.scene.add.text(-100, totalY, 'Total: --', {
            fontSize: '22px',
            color: '#d6eaf8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.payoutText = this.scene.add.text(-100, totalY + 34, 'Potential Reward: --', {
            fontSize: '18px',
            color: '#d6eaf8'
        }).setOrigin(0.5);

        this.statusText = this.scene.add.text(-100, totalY - 180, '', {
            fontSize: '18px',
            color: COLORS.statusInfo
        }).setOrigin(0.5);

        this.container.add(this.totalText);
        this.container.add(this.payoutText);
        this.container.add(this.statusText);
    }

    createControlButtons() {
        const bottomY = PANEL_HEIGHT / 2 - 60;

        this.rollButton = this.createActionButton({
            x: -100,
            y: bottomY,
            label: 'Roll Dice',
            onClick: () => this.handleRollAction(),
            width: 160,
        });

        this.finishButton = this.createActionButton({
            x: PANEL_WIDTH / 2 - INSTRUCTIONS_WIDTH / 2 - 32,
            y: bottomY,
            label: 'Leave (0g)',
            onClick: () => this.handleFinish(),
            width: 200,
        });
    }

    createInstructionPanel() {
        const panelHeight = PANEL_HEIGHT - 250;
        const x = PANEL_WIDTH / 2 - INSTRUCTIONS_WIDTH / 2 - 32;
        const instructionsContainer = this.scene.add.container(x, 20);

        const background = this.scene.add.rectangle(0, 0, INSTRUCTIONS_WIDTH, panelHeight, COLORS.instructionsBg, 0.92)
            .setStrokeStyle(2, COLORS.instructionsStroke, 0.8);

        const title = this.scene.add.text(0, -panelHeight / 2 + 24, 'Instructions', {
            fontSize: '22px',
            color: '#eaf6fb',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);

        const bodyText = this.scene.add.text(-INSTRUCTIONS_WIDTH / 2 + 16, title.y + 40,
            '• Roll either 2 or 3 dice.\n' +
            '• Aim for a total as close to 10 without going over.\n' +
            '• After rolling: cash out early, or re-roll some/all dice once.\n',
            {
                fontSize: '16px',
                color: '#d6f1ff',
                wordWrap: { width: INSTRUCTIONS_WIDTH - 16 },
                lineSpacing: 6
            }
        );

        instructionsContainer.add([background, title, bodyText]);
        this.container.add(instructionsContainer);
    }

    createActionButton({ x, y, label, onClick, width }) {
        const container = this.scene.add.container(x, y);
        const background = this.scene.add.rectangle(0, 0, width, 52, COLORS.button, 0.92)
            .setStrokeStyle(2, COLORS.buttonStroke, 0.9)
            .setInteractive({ useHandCursor: true });

        applyRectangleButtonStyle(background, {
            baseColor: COLORS.button,
            baseAlpha: 0.92,
            hoverBlend: 0.16,
            pressBlend: 0.28,
            disabledBlend: 0.45,
            enabledAlpha: 1,
            disabledAlpha: 0.35
        });

        background.on('pointerup', () => {
            onClick();
        });

        const text = this.scene.add.text(0, 0, label, {
            fontSize: '18px',
            color: '#eaf2f8'
        }).setOrigin(0.5);

        container.add([background, text]);
        this.container.add(container);
        return { container, background, text };
    }

    setDiceCount(count) {
        if (this.hasRolled || ![2, 3].includes(count) || count === this.diceCount) {
            return;
        }
        this.diceCount = count;
        this.diceValues = new Array(count).fill(null);
        this.diceSelected = new Array(count).fill(true);
        this.hasRolled = false;
        this.rerollUsed = false;
        this.statusText.setText('');
        this.refreshDiceSlots();
        this.updateDiceCountSelection();
        this.updateDiceDisplay();
        this.updateTowerFill();
        this.updateOutcomeText();
        this.updateButtonState();
        this.updateRollButtonLabel();
    }

    refreshDiceSlots() {
        this.diceSlots.forEach(slot => {
            if (slot.dieFace && typeof slot.dieFace.destroy === 'function') {
                slot.dieFace.destroy();
            }
            slot.container.destroy(true);
        });
        this.diceSlots = [];

        const spacing = DICE_SPACING;
        const startX = -((this.diceCount - 1) * spacing) / 2;

        for (let i = 0; i < this.diceCount; i += 1) {
            const container = this.scene.add.container(startX + i * spacing, 0);
            const dieFace = createDieFace(this.scene, {
                size: DICE_SIZE,
                questionMarkStyle: {
                    fontSize: `${Math.round(DICE_SIZE * 0.55)}px`,
                    color: COLORS.diceText,
                    fontStyle: 'bold'
                }
            });

            dieFace.showUnknown();
            dieFace.background.setInteractive({ useHandCursor: true });
            dieFace.background.on('pointerup', () => {
                this.toggleDieSelection(i);
            });

            const selectionText = this.scene.add.text(0, DICE_SIZE / 2 + 18, 'Roll', {
                fontSize: '16px',
                color: '#f7c873'
            }).setOrigin(0.5);

            container.add([dieFace.container, selectionText]);
            this.diceContainer.add(container);
            this.diceSlots.push({ container, dieFace, selectionText });
        }
    }

    toggleDieSelection(index) {
        if (!this.canAdjustSelection()) {
            return;
        }
        this.diceSelected[index] = !this.diceSelected[index];
        this.updateDiceDisplay();
    }

    canAdjustSelection() {
        return this.hasRolled && !this.rerollUsed;
    }

    updateDiceCountSelection() {
        this.diceCountButtons.forEach(({ background, text, count }) => {
            const isSelected = count === this.diceCount;
            const fillColor = isSelected ? 0x265c7e : COLORS.button;
            const strokeColor = isSelected ? COLORS.instructionsStroke : COLORS.buttonStroke;
            const style = background.getData && background.getData('rectButtonStyle');
            if (style) {
                style.baseColor = fillColor;
            }
            background.setFillStyle(fillColor, 0.95);
            background.setStrokeStyle(2, strokeColor, isSelected ? 1 : 0.8);
            background.setAlpha(isSelected ? 1 : 0.9);
            if (isSelected) {
                background.disableInteractive();
            } else {
                background.setInteractive({ useHandCursor: true });
            }
            text.setColor(isSelected ? '#ffffff' : '#eaf2f8');
        });
    }

    updateDiceDisplay() {
        if (!this.diceSlots || this.diceSlots.length !== this.diceCount) {
            this.refreshDiceSlots();
        }

        this.diceSlots.forEach((slot, index) => {
            const value = this.diceValues[index];
            const selected = this.diceSelected[index];
            const dieFace = slot.dieFace;

            if (value != null) {
                dieFace.setValue(value);
            } else {
                dieFace.showUnknown();
            }

            slot.selectionText.setVisible(this.hasRolled && !this.rerollUsed);
            if (this.hasRolled && !this.rerollUsed) {
                slot.selectionText.setText(selected ? 'Roll' : 'Keep');
                slot.selectionText.setColor(selected ? '#f7c873' : '#d6eaf8');
            } else {
                slot.selectionText.setText('');
            }

            const canAdjust = this.canAdjustSelection();
            const highlightSelection = selected && canAdjust;
            setDieBackgroundFill(dieFace, highlightSelection ? COLORS.diceSelected : COLORS.diceBase);

            if (canAdjust) {
                dieFace.background.setInteractive({ useHandCursor: true });
                dieFace.background.setAlpha(1);
            } else if (!this.hasRolled) {
                dieFace.background.disableInteractive();
                dieFace.background.setAlpha(0.85);
            } else {
                dieFace.background.disableInteractive();
                dieFace.background.setAlpha(1);
            }
        });
    }

    getCurrentTotal() {
        if (!this.hasRolled) {
            return 0;
        }
        return this.diceValues.reduce((sum, value) => sum + (value || 0), 0);
    }

    updateTowerFill() {
        const total = this.getCurrentTotal();
        this.towerSteps.forEach(({ level, rect, label, rewardLabel, rewardColor }) => {
            const baseLabelColor = '#0b1a2b';
            const fadedColor = '#5b6a7f';
            const bustTextColor = '#f8f8f8';

            if (!this.hasRolled) {
                rect.setStrokeStyle(2, COLORS.buttonStroke, 0.6);
                rect.setFillStyle(COLORS.towerBase, level === 11 ? 0.25 : 0.35);
                label.setColor(baseLabelColor);
                rewardLabel.setColor(rewardColor);
                return;
            }

            if (total > 11) {
                rect.setStrokeStyle(2, COLORS.towerBustFill, 0.9);
                rect.setFillStyle(COLORS.towerBustFill, 0.98);
                label.setColor(bustTextColor);
                rewardLabel.setColor(bustTextColor);
                return;
            }

            if (total === 11 && level === 11) {
                rect.setStrokeStyle(2, COLORS.buttonStroke, 0.9);
                rect.setFillStyle(COLORS.towerHighlight, 0.95);
                label.setColor(baseLabelColor);
                rewardLabel.setColor(rewardColor);
                return;
            }

            if (total >= level && total <= 10) {
                rect.setStrokeStyle(2, COLORS.buttonStroke, 0.9);
                rect.setFillStyle(COLORS.towerHighlight, 0.95);
                label.setColor(baseLabelColor);
                rewardLabel.setColor(rewardColor);
            } else {
                rect.setStrokeStyle(2, COLORS.buttonStroke, 0.6);
                rect.setFillStyle(COLORS.towerBase, total > 10 ? 0.25 : 0.55);
                const textColor = total > 10 ? fadedColor : baseLabelColor;
                label.setColor(textColor);
                rewardLabel.setColor(total > 10 ? fadedColor : rewardColor);
            }
        });
    }

    updateOutcomeText() {
        const total = this.getCurrentTotal();
        if (!this.hasRolled) {
            this.totalText.setText('Total: --');
            this.payoutText.setText('Potential Reward: --');
            this.finishButton.text.setText('Leave (0g)');
            return;
        }

        this.totalText.setText(`Total: ${total}`);
        const payout = calculatePayout(total);
        if (total > 10) {
            this.payoutText.setText('Bust! No gold.');
        } else {
            this.payoutText.setText(`Potential Reward: ${payout} gold`);
        }
        const cashLabel = payout > 0 ? `Cash Out (+${payout}g)` : 'Cash Out (0g)';
        this.finishButton.text.setText(cashLabel);
    }

    updateButtonState() {
        setRectangleButtonEnabled(this.rollButton.background, !this.hasRolled || !this.rerollUsed);
        setRectangleButtonEnabled(this.finishButton.background, true);
    }

    handleRollAction() {
        if (!this.hasRolled) {
            this.performFirstRoll();
            return;
        }

        if (this.rerollUsed) {
            return;
        }
        const anySelected = this.diceSelected.some(selected => selected);
        if (!anySelected) {
            this.statusText.setText('Select dice to roll, or cash out.');
            this.statusText.setColor(COLORS.statusWarning);
            return;
        }
        this.performReroll();
    }

    performFirstRoll() {
        this.diceValues = this.diceValues.map(() => rollDie());
        this.hasRolled = true;
        this.rerollUsed = false;
        this.diceSelected = this.diceSelected.map(() => false);
        this.statusText.setText('Select dice to re-roll, or cash out.');
        this.statusText.setColor(COLORS.statusInfo);
        this.hideDiceCountButtons();
        this.updateDiceDisplay();
        this.updateTowerFill();
        this.updateOutcomeText();
        this.updateRollButtonLabel();
        this.updateButtonState();
    }

    performReroll() {
        this.diceValues = this.diceValues.map((value, index) => (this.diceSelected[index] ? rollDie() : value));
        this.rerollUsed = true;
        this.diceSelected = this.diceSelected.map(() => false);
        this.statusText.setText(
            'Final result locked in.\n' +
            ' Cash out to continue.');
        this.statusText.setColor(COLORS.statusInfo);
        this.updateDiceDisplay();
        this.updateTowerFill();
        this.updateOutcomeText();
        this.updateRollButtonLabel();
        this.updateButtonState();
    }

    updateRollButtonLabel() {
        if (!this.hasRolled) {
            this.rollButton.text.setText('Roll Dice');
        } else if (!this.rerollUsed) {
            this.rollButton.text.setText('Re-Roll Dice');
        } else {
            this.rollButton.text.setText('Re-Roll Used');
        }
    }

    handleFinish() {
        const total = this.hasRolled ? this.getCurrentTotal() : 0;
        let outcome = 'leave';
        let gold = 0;
        if (this.hasRolled) {
            const payout = calculatePayout(total);
            gold = payout;
            outcome = total > 10 ? 'bust' : 'cashout';
        }
        this.finish({ gold, total, outcome });
    }

    finish({ gold, total, outcome }) {
        if (this.isDestroyed) {
            return;
        }
        this.destroy();
        this.onComplete({ gold, total, outcome });
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;
        destroyModal(this.modal);
        this.modal = null;
        this.diceSlots = [];
        this.towerSteps = [];
    }
}
