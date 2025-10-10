import { createModal, destroyModal } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle, setRectangleButtonEnabled } from './ui/ButtonStyles.js';

const PANEL_WIDTH = 940;
const PANEL_HEIGHT = 520;
const INSTRUCTIONS_WIDTH = 260;
const ACTION_BUTTON_WIDTH = 200;
const DICE_SIZE = 96;
const DICE_SPACING = 110;
const TOWER_STEP_COUNT = 10;
const TOWER_STEP_HEIGHT = 28;
const TOWER_STEP_WIDTH = 80;

const COLORS = {
    diceBase: 0x10293d,
    diceHeldStroke: 0xf1c40f,
    diceIdleStroke: 0x1f4d74,
    diceText: '#f8fbff',
    towerBase: 0xecf0f1,
    towerHighlight: 0xf7c873,
    instructionsBg: 0x0b1f31,
    instructionsStroke: 0x5dade2,
    button: 0x1c3a4d,
    buttonStroke: 0x5dade2,
    statusInfo: '#aed6f1',
    statusWarning: '#f5b041'
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
        this.heldDice = new Array(this.diceCount).fill(false);
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
            subtitle: 'Press your luck to climb the tower'
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
    }

    createDiceCountButtons() {
        this.diceCountButtons = [];
        const topY = -PANEL_HEIGHT / 2 + 120;
        const configs = [
            { count: 2, label: 'Play 2 Dice', x: -240 },
            { count: 3, label: 'Play 3 Dice', x: -40 }
        ];

        configs.forEach(({ count, label, x }) => {
            const container = this.scene.add.container(x, topY);
            const background = this.scene.add.rectangle(0, 0, 170, 52, COLORS.button, 0.92)
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

    createTowerDisplay() {
        const towerContainer = this.scene.add.container(140, 30);
        const header = this.scene.add.text(0, -TOWER_STEP_COUNT * TOWER_STEP_HEIGHT / 2 - 40, 'Tower Fill', {
            fontSize: '22px',
            color: '#eaf6fb',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        towerContainer.add(header);

        for (let i = 0; i < TOWER_STEP_COUNT; i += 1) {
            const level = TOWER_STEP_COUNT - i;
            const y = (i - (TOWER_STEP_COUNT - 1) / 2) * (TOWER_STEP_HEIGHT + 4);
            const stepRect = this.scene.add.rectangle(0, y, TOWER_STEP_WIDTH, TOWER_STEP_HEIGHT, COLORS.towerBase, 0.7)
                .setStrokeStyle(2, COLORS.buttonStroke, 0.6);
            const label = this.scene.add.text(0, y, `${level}`, {
                fontSize: '16px',
                color: '#0b1a2b'
            }).setOrigin(0.5);

            towerContainer.add(stepRect);
            towerContainer.add(label);
            this.towerSteps.push({ level, rect: stepRect, label });
        }

        this.container.add(towerContainer);
    }

    createDiceDisplay() {
        this.diceContainer = this.scene.add.container(-220, 40);
        this.container.add(this.diceContainer);
    }

    createStatusTexts() {
        const totalY = PANEL_HEIGHT / 2 - 150;
        this.totalText = this.scene.add.text(-220, totalY, 'Total: --', {
            fontSize: '22px',
            color: '#d6eaf8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.payoutText = this.scene.add.text(-220, totalY + 36, 'Potential Reward: --', {
            fontSize: '18px',
            color: '#d6eaf8'
        }).setOrigin(0.5);

        this.statusText = this.scene.add.text(140, totalY + 36, '', {
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
            x: -260,
            y: bottomY,
            label: 'Roll Dice',
            onClick: () => this.handleRoll()
        });

        this.rerollButton = this.createActionButton({
            x: 0,
            y: bottomY,
            label: 'Use Re-roll',
            onClick: () => this.handleReroll()
        });

        this.cashOutButton = this.createActionButton({
            x: 260,
            y: bottomY,
            label: 'Cash Out',
            onClick: () => this.handleCashOut()
        });
    }

    createInstructionPanel() {
        const panelHeight = PANEL_HEIGHT - 120;
        const x = PANEL_WIDTH / 2 - INSTRUCTIONS_WIDTH / 2 - 32;
        const instructionsContainer = this.scene.add.container(x, 20);

        const background = this.scene.add.rectangle(0, 0, INSTRUCTIONS_WIDTH, panelHeight, COLORS.instructionsBg, 0.92)
            .setStrokeStyle(2, COLORS.instructionsStroke, 0.8);

        const title = this.scene.add.text(0, -panelHeight / 2 + 24, 'How it works', {
            fontSize: '22px',
            color: '#eaf6fb',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);

        const bodyText = this.scene.add.text(-INSTRUCTIONS_WIDTH / 2 + 16, title.y + 40,
            '• Pick 2 or 3 dice before rolling.\n' +
            '• Roll to climb the tower. Totals of 1-10 turn tiers gold; 11+ stays white.\n' +
            '• After the first roll you may lock dice by clicking them, then use your single re-roll.\n' +
            '• Cash out whenever you like — but totals 11+ earn no gold.',
            {
                fontSize: '16px',
                color: '#d6f1ff',
                wordWrap: { width: INSTRUCTIONS_WIDTH - 32 },
                lineSpacing: 6
            }
        );

        const payoutsTitle = this.scene.add.text(-INSTRUCTIONS_WIDTH / 2 + 16, bodyText.y + bodyText.height + 28,
            'Payout Tiers', {
                fontSize: '18px',
                color: '#f7c873',
                fontStyle: 'bold'
            }
        );

        const payoutDetails = this.scene.add.text(-INSTRUCTIONS_WIDTH / 2 + 16, payoutsTitle.y + 26,
            '1 – 5  → total ×10 gold\n6 – 8  → total ×20 gold\n9 – 10 → total ×30 gold\n11+    → bust (0 gold)',
            {
                fontSize: '16px',
                color: '#d6f1ff',
                lineSpacing: 6
            }
        );

        const leaveY = panelHeight / 2 - 40;
        const leaveBackground = this.scene.add.rectangle(0, leaveY, INSTRUCTIONS_WIDTH - 40, 48, COLORS.button, 0.9)
            .setStrokeStyle(2, COLORS.buttonStroke, 0.85)
            .setInteractive({ useHandCursor: true });

        applyRectangleButtonStyle(leaveBackground, {
            baseColor: COLORS.button,
            baseAlpha: 0.9,
            hoverBlend: 0.16,
            pressBlend: 0.28,
            disabledBlend: 0.45,
            enabledAlpha: 1,
            disabledAlpha: 0.35
        });

        leaveBackground.on('pointerup', () => {
            const total = this.hasRolled ? this.getCurrentTotal() : 0;
            this.finish({ gold: 0, total, outcome: 'leave' });
        });

        const leaveText = this.scene.add.text(0, leaveY, 'Leave (0 gold)', {
            fontSize: '18px',
            color: '#eaf2f8'
        }).setOrigin(0.5);

        instructionsContainer.add([background, title, bodyText, payoutsTitle, payoutDetails, leaveBackground, leaveText]);
        this.container.add(instructionsContainer);
    }

    createActionButton({ x, y, label, onClick, width = ACTION_BUTTON_WIDTH }) {
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
        if (![2, 3].includes(count) || count === this.diceCount) {
            return;
        }
        this.diceCount = count;
        this.diceValues = new Array(count).fill(null);
        this.heldDice = new Array(count).fill(false);
        this.hasRolled = false;
        this.rerollUsed = false;
        this.statusText.setText('');
        this.refreshDiceSlots();
        this.updateDiceCountSelection();
        this.updateDiceDisplay();
        this.updateTowerFill();
        this.updateOutcomeText();
        this.updateButtonState();
    }

    refreshDiceSlots() {
        this.diceSlots.forEach(slot => slot.container.destroy(true));
        this.diceSlots = [];

        const spacing = DICE_SPACING;
        const startX = -((this.diceCount - 1) * spacing) / 2;

        for (let i = 0; i < this.diceCount; i += 1) {
            const container = this.scene.add.container(startX + i * spacing, 0);
            const background = this.scene.add.rectangle(0, 0, DICE_SIZE, DICE_SIZE, COLORS.diceBase, 0.92)
                .setStrokeStyle(3, COLORS.diceIdleStroke, 0.95)
                .setInteractive({ useHandCursor: true });

            background.on('pointerup', () => {
                this.toggleDieHeld(i);
            });

            const valueText = this.scene.add.text(0, -6, '?', {
                fontSize: '46px',
                color: COLORS.diceText,
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const heldText = this.scene.add.text(0, DICE_SIZE / 2 - 20, 'Locked', {
                fontSize: '16px',
                color: '#f7c873'
            }).setOrigin(0.5);

            container.add([background, valueText, heldText]);
            this.diceContainer.add(container);
            this.diceSlots.push({ container, background, valueText, heldText });
        }
    }

    toggleDieHeld(index) {
        if (!this.canAdjustLocks()) {
            return;
        }
        this.heldDice[index] = !this.heldDice[index];
        this.updateDiceDisplay();
    }

    canAdjustLocks() {
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
            const held = this.heldDice[index];

            slot.valueText.setText(value != null ? `${value}` : '?');
            slot.valueText.setAlpha(value != null ? 1 : 0.6);
            slot.heldText.setVisible(held && this.hasRolled && !this.rerollUsed);

            const strokeColor = held ? COLORS.diceHeldStroke : COLORS.diceIdleStroke;
            const strokeAlpha = held ? 0.95 : 0.75;
            slot.background.setStrokeStyle(held ? 4 : 3, strokeColor, strokeAlpha);

            if (this.canAdjustLocks()) {
                slot.background.setInteractive({ useHandCursor: true });
                slot.background.setAlpha(1);
            } else if (!this.hasRolled) {
                slot.background.disableInteractive();
                slot.background.setAlpha(0.7);
            } else {
                slot.background.disableInteractive();
                slot.background.setAlpha(held ? 0.95 : 1);
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
        this.towerSteps.forEach(({ level, rect, label }) => {
            if (!this.hasRolled) {
                rect.setFillStyle(COLORS.towerBase, 0.35);
                label.setColor('#0b1a2b');
                return;
            }

            if (total >= level && total <= 10) {
                rect.setFillStyle(COLORS.towerHighlight, 0.95);
                label.setColor('#0b1a2b');
            } else {
                rect.setFillStyle(COLORS.towerBase, total > 10 ? 0.25 : 0.55);
                label.setColor(total > 10 ? '#5b6a7f' : '#0b1a2b');
            }
        });
    }

    updateOutcomeText() {
        const total = this.getCurrentTotal();
        if (!this.hasRolled) {
            this.totalText.setText('Total: --');
            this.payoutText.setText('Potential Reward: --');
            this.cashOutButton.text.setText('Cash Out');
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
        this.cashOutButton.text.setText(cashLabel);
    }

    updateButtonState() {
        setRectangleButtonEnabled(this.rollButton.background, !this.hasRolled);
        setRectangleButtonEnabled(this.rerollButton.background, this.hasRolled && !this.rerollUsed);
        setRectangleButtonEnabled(this.cashOutButton.background, this.hasRolled);
    }

    handleRoll() {
        if (this.hasRolled) {
            return;
        }
        this.diceValues = this.diceValues.map(() => rollDie());
        this.heldDice = this.heldDice.map(() => false);
        this.hasRolled = true;
        this.rerollUsed = false;
        this.statusText.setText('Click dice to lock them before your re-roll.');
        this.statusText.setColor(COLORS.statusInfo);
        this.updateDiceDisplay();
        this.updateTowerFill();
        this.updateOutcomeText();
        this.updateButtonState();
    }

    handleReroll() {
        if (!this.hasRolled || this.rerollUsed) {
            return;
        }
        const anyUnlocked = this.heldDice.some(held => !held);
        if (!anyUnlocked) {
            this.statusText.setText('Unlock at least one die to re-roll.');
            this.statusText.setColor(COLORS.statusWarning);
            return;
        }

        this.diceValues = this.diceValues.map((value, index) => (this.heldDice[index] ? value : rollDie()));
        this.rerollUsed = true;
        this.statusText.setText('Final result locked in. Cash out to continue.');
        this.statusText.setColor(COLORS.statusInfo);
        this.updateDiceDisplay();
        this.updateTowerFill();
        this.updateOutcomeText();
        this.updateButtonState();
    }

    handleCashOut() {
        if (!this.hasRolled) {
            return;
        }
        const total = this.getCurrentTotal();
        const payout = calculatePayout(total);
        const outcome = total > 10 ? 'bust' : 'cashout';
        this.finish({ gold: payout, total, outcome });
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
