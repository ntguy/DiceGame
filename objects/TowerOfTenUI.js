import { createModal, destroyModal } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';

const PANEL_WIDTH = 980;
const PANEL_HEIGHT = 540;
const TOWER_SEGMENTS = 10;
const DIE_SIZE = 86;
const DIE_GAP = 24;
const DICE_AREA_Y = 120;
const ACTION_BUTTON_WIDTH = 200;
const ACTION_BUTTON_HEIGHT = 54;

export class TowerOfTenUI {
    constructor(scene, { onComplete } = {}) {
        this.scene = scene;
        this.onComplete = typeof onComplete === 'function' ? onComplete : () => {};

        this.modal = null;
        this.container = null;
        this.backdrop = null;

        this.diceCount = 2;
        this.diceValues = [];
        this.diceHolds = [];
        this.diceNodes = [];
        this.hasRolled = false;
        this.hasRerolled = false;
        this.hasCashedOut = false;
        this.isComplete = false;

        this.totalText = null;
        this.rewardText = null;
        this.statusText = null;
        this.towerSegments = [];

        this.rollButton = null;
        this.rerollButton = null;
        this.cashOutButton = null;
        this.leaveButton = null;
        this.diceCountButtons = [];
        this.diceArea = null;

        this.create();
    }

    create() {
        const modal = createModal(this.scene, {
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
            panelColor: 0x120b1c,
            panelAlpha: 0.95,
            strokeColor: 0xa569bd,
            strokeAlpha: 0.9,
            title: 'Tower of Ten',
            titleStyle: {
                fontSize: '42px',
                color: '#d7b0ff',
                fontStyle: 'bold'
            },
            subtitle: 'Press your luck to climb the golden tower',
            subtitleStyle: {
                fontSize: '22px',
                color: '#f8f3ff'
            }
        });

        this.modal = modal;
        this.container = modal.container;
        this.backdrop = modal.backdrop;

        this.createTowerDisplay();
        this.createDiceControls();
        this.createInstructionsPanel();
        this.updateDiceCountButtons();
        this.resetDiceValues();
        this.updateStatusTexts(0);
        this.updateTower(0);
    }

    createTowerDisplay() {
        const towerContainer = this.scene.add.container(-PANEL_WIDTH / 2 + 220, 40);
        const towerBg = this.scene.add.rectangle(0, 48, 230, 360, 0x1b1033, 0.9)
            .setStrokeStyle(2, 0xd7b0ff, 0.6);
        towerContainer.add(towerBg);

        const stepHeight = 30;
        const startY = -120;
        this.towerSegments = [];

        for (let level = TOWER_SEGMENTS; level >= 1; level -= 1) {
            const y = startY + (TOWER_SEGMENTS - level) * stepHeight;
            const segmentBg = this.scene.add.rectangle(0, y, 180, 26, 0xffffff, 0.18)
                .setStrokeStyle(2, 0xd7b0ff, 0.25);
            const label = this.scene.add.text(-70, y, `${level}`, {
                fontSize: '18px',
                color: '#fdfdff'
            }).setOrigin(0.5);
            const fill = this.scene.add.rectangle(20, y, 140, 22, 0xf1c40f, 0)
                .setOrigin(0.5, 0.5);

            towerContainer.add([segmentBg, fill, label]);
            this.towerSegments[level] = { background: segmentBg, fill, label };
        }

        const totalLabel = this.scene.add.text(0, 128, 'Current Total', {
            fontSize: '20px',
            color: '#f8f3ff'
        }).setOrigin(0.5);
        this.totalText = this.scene.add.text(0, totalLabel.y + 40, '0', {
            fontSize: '42px',
            color: '#f1c40f',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.rewardText = this.scene.add.text(0, this.totalText.y + 52, 'Potential: 0g', {
            fontSize: '20px',
            color: '#f8f3ff'
        }).setOrigin(0.5);

        towerContainer.add([totalLabel, this.totalText, this.rewardText]);
        this.container.add(towerContainer);
    }

    createDiceControls() {
        const controlsContainer = this.scene.add.container(0, 120);

        const selectorLabel = this.scene.add.text(0, -PANEL_HEIGHT / 2 + 120, 'Choose your dice', {
            fontSize: '22px',
            color: '#f8f3ff'
        }).setOrigin(0.5);

        const twoDiceButton = this.createDiceCountButton(-70, selectorLabel.y + 50, 2, '2 Dice');
        const threeDiceButton = this.createDiceCountButton(70, selectorLabel.y + 50, 3, '3 Dice');

        this.diceCountButtons = [twoDiceButton, threeDiceButton];

        this.diceArea = this.scene.add.container(0, DICE_AREA_Y);

        this.statusText = this.scene.add.text(0, 200, '', {
            fontSize: '20px',
            color: '#f8f3ff'
        }).setOrigin(0.5);

        const buttonY = 260;
        this.rollButton = this.createActionButton(-ACTION_BUTTON_WIDTH - 20, buttonY, ACTION_BUTTON_WIDTH, ACTION_BUTTON_HEIGHT, 'Roll Dice', () => this.handleInitialRoll());
        this.rerollButton = this.createActionButton(0, buttonY, ACTION_BUTTON_WIDTH, ACTION_BUTTON_HEIGHT, 'Re-roll Selected', () => this.handleReroll());
        this.cashOutButton = this.createActionButton(ACTION_BUTTON_WIDTH + 20, buttonY, ACTION_BUTTON_WIDTH, ACTION_BUTTON_HEIGHT, 'Cash Out', () => this.handleCashOut());
        this.leaveButton = this.createActionButton(0, buttonY + 70, ACTION_BUTTON_WIDTH + 40, ACTION_BUTTON_HEIGHT - 6, 'Leave Tower', () => this.finish({ leftEarly: true }));

        controlsContainer.add([
            selectorLabel,
            ...this.diceCountButtons.map(btn => btn.container),
            this.diceArea,
            this.statusText,
            this.rollButton.container,
            this.rerollButton.container,
            this.cashOutButton.container,
            this.leaveButton.container
        ]);

        this.container.add(controlsContainer);
        this.updateActionButtons();
    }

    createDiceCountButton(x, y, value, label) {
        const container = this.scene.add.container(x, y);
        const background = this.scene.add.rectangle(0, 0, 140, 48, 0x251539, 0.92)
            .setStrokeStyle(2, 0xd7b0ff, 0.85)
            .setInteractive({ useHandCursor: true });
        const text = this.scene.add.text(0, 0, label, {
            fontSize: '18px',
            color: '#fdfdff'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(background, {
            baseColor: 0x251539,
            baseAlpha: 0.92,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            enabledAlpha: 1,
            disabledBlend: 0.6,
            disabledAlpha: 0.45
        });

        background.on('pointerup', () => {
            if (this.hasRolled || this.isComplete) {
                return;
            }
            this.diceCount = value;
            this.updateDiceCountButtons();
            this.resetDiceValues();
        });

        container.add([background, text]);
        return { container, background, text, value };
    }

    createActionButton(x, y, width, height, label, onClick) {
        const container = this.scene.add.container(x, y);
        const background = this.scene.add.rectangle(0, 0, width, height, 0x331d4c, 0.95)
            .setStrokeStyle(2, 0xd7b0ff, 0.85)
            .setInteractive({ useHandCursor: true });
        const text = this.scene.add.text(0, 0, label, {
            fontSize: '20px',
            color: '#fdfdff'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(background, {
            baseColor: 0x331d4c,
            baseAlpha: 0.95,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            enabledAlpha: 1,
            disabledBlend: 0.6,
            disabledAlpha: 0.45
        });

        background.on('pointerup', () => {
            if (this.isComplete) {
                return;
            }
            onClick();
        });

        container.add([background, text]);
        return { container, background, text, onClick };
    }

    createInstructionsPanel() {
        const instructionsContainer = this.scene.add.container(PANEL_WIDTH / 2 - 240, 40);
        const background = this.scene.add.rectangle(0, 60, 260, 380, 0x1f1230, 0.92)
            .setStrokeStyle(2, 0xd7b0ff, 0.6);
        const title = this.scene.add.text(0, -108, 'How it Works', {
            fontSize: '24px',
            color: '#f8f3ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const instructions = [
            '• Pick 2 or 3 dice to play.',
            '• Roll to climb the tower (1-10).',
            '• Tap dice to toggle which will re-roll.',
            '• You get one re-roll or you can cash out.',
            '',
            'Payouts:',
            '1-5  → total ×10 gold',
            '6-8  → total ×20 gold',
            '9-10 → total ×30 gold',
            '11+  → bust (no gold)'
        ].join('\n');

        const instructionsText = this.scene.add.text(0, -60, instructions, {
            fontSize: '18px',
            color: '#f8f3ff',
            wordWrap: { width: 220 },
            lineSpacing: 6
        }).setOrigin(0.5, 0);

        instructionsContainer.add([background, title, instructionsText]);
        this.container.add(instructionsContainer);
    }

    resetDiceValues() {
        this.diceValues = Array.from({ length: this.diceCount }, () => 1);
        this.diceHolds = Array.from({ length: this.diceCount }, () => true);
        this.hasRolled = false;
        this.hasRerolled = false;
        this.hasCashedOut = false;
        this.updateDiceDisplays();
        this.updateActionButtons();
        this.updateStatusTexts(0);
        this.updateTower(0);
        this.updateDiceCountButtons();
    }

    updateDiceCountButtons() {
        this.diceCountButtons.forEach(button => {
            const isActive = button.value === this.diceCount;
            button.background.setFillStyle(isActive ? 0x4a2672 : 0x251539, isActive ? 0.95 : 0.92);
            button.text.setColor(isActive ? '#ffeefc' : '#fdfdff');
            if (this.hasRolled || this.isComplete) {
                button.background.disableInteractive();
                button.background.setAlpha(0.6);
                button.text.setAlpha(0.65);
            } else {
                button.background.setInteractive({ useHandCursor: true });
                button.background.setAlpha(1);
                button.text.setAlpha(1);
            }
        });
    }

    updateDiceDisplays() {
        if (this.diceArea) {
            this.diceArea.removeAll(true);
        }

        const totalWidth = this.diceCount * DIE_SIZE + (this.diceCount - 1) * DIE_GAP;
        const startX = -totalWidth / 2 + DIE_SIZE / 2;

        this.diceNodes = [];

        for (let i = 0; i < this.diceCount; i += 1) {
            const x = startX + i * (DIE_SIZE + DIE_GAP);
            const container = this.scene.add.container(x, 0);
            const background = this.scene.add.rectangle(0, 0, DIE_SIZE, DIE_SIZE, 0x241232, 0.9)
                .setStrokeStyle(3, 0xd7b0ff, 0.8)
                .setInteractive({ useHandCursor: true });
            const valueText = this.scene.add.text(0, -6, `${this.diceValues[i] || 1}`, {
                fontSize: '36px',
                color: '#fdfdff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            const holdText = this.scene.add.text(0, 26, this.getHoldLabel(i), {
                fontSize: '16px',
                color: '#d7b0ff'
            }).setOrigin(0.5);

            background.on('pointerup', () => this.toggleDieHold(i));

            container.add([background, valueText, holdText]);
            this.diceArea.add(container);
            this.diceNodes.push({ container, background, valueText, holdText });
        }

        this.refreshDiceInteractivity();
    }

    refreshDiceInteractivity() {
        this.diceNodes.forEach((node, index) => {
            if (!node.background) {
                return;
            }
            if (this.hasRolled && !this.isComplete && !this.hasCashedOut) {
                node.background.setInteractive({ useHandCursor: true });
            } else {
                node.background.disableInteractive();
            }
            this.updateDieVisual(index);
        });
    }

    toggleDieHold(index) {
        if (!this.hasRolled || this.isComplete || this.hasCashedOut) {
            return;
        }
        if (!Array.isArray(this.diceHolds) || typeof this.diceHolds[index] === 'undefined') {
            return;
        }
        this.diceHolds[index] = !this.diceHolds[index];
        this.updateDieVisual(index);
    }

    getHoldLabel(index) {
        if (!this.hasRolled) {
            return 'Roll';
        }
        return this.diceHolds[index] ? 'Hold' : 'Re-roll';
    }

    updateDieVisual(index) {
        const node = this.diceNodes[index];
        if (!node) {
            return;
        }
        const isHold = this.diceHolds[index];
        const isActive = this.hasRolled && !this.isComplete && !this.hasCashedOut;
        const fillColor = isHold ? 0x3a1d58 : 0x221032;
        const alpha = this.hasRolled ? 0.95 : 0.85;
        node.background.setFillStyle(fillColor, alpha);
        const displayValue = this.hasRolled ? `${this.diceValues[index] || 1}` : '–';
        node.valueText.setText(displayValue);
        node.holdText.setText(this.getHoldLabel(index));
        node.holdText.setColor(isHold ? '#f1c40f' : '#ff9ff3');
        if (!isActive) {
            node.background.disableInteractive();
        }
    }

    handleInitialRoll() {
        if (this.hasRolled || this.isComplete) {
            return;
        }
        this.rollDice();
        this.hasRolled = true;
        this.diceHolds = Array.from({ length: this.diceCount }, () => true);
        this.updateTower(this.getDiceTotal());
        this.updateStatusTexts(this.getDiceTotal());
        this.updateActionButtons();
        this.updateDiceCountButtons();
        this.refreshDiceInteractivity();
        if (this.scene.sound) {
            this.scene.sound.play('multiDiceRoll', { volume: 0.6 });
        }
    }

    handleReroll() {
        if (!this.hasRolled || this.hasRerolled || this.isComplete) {
            return;
        }
        if (this.scene.sound && typeof this.scene.sound.play === 'function') {
            this.scene.sound.play('diceRoll', { volume: 0.6 });
        }

        for (let i = 0; i < this.diceCount; i += 1) {
            if (!this.diceHolds[i]) {
                this.diceValues[i] = Phaser.Math.Between(1, 6);
            }
        }

        this.hasRerolled = true;
        this.diceHolds = Array.from({ length: this.diceCount }, () => true);
        this.updateDiceDisplays();
        const total = this.getDiceTotal();
        this.updateTower(total);
        this.updateStatusTexts(total);
        this.updateActionButtons();
    }

    handleCashOut() {
        if (!this.hasRolled || this.isComplete) {
            return;
        }
        const total = this.getDiceTotal();
        const reward = this.calculateReward(total);
        const bust = total > 10;
        this.hasCashedOut = true;
        this.finish({ cashedOut: true, total, rewardGold: bust ? 0 : reward, bust });
    }

    rollDice() {
        for (let i = 0; i < this.diceCount; i += 1) {
            this.diceValues[i] = Phaser.Math.Between(1, 6);
        }
        this.updateDiceDisplays();
    }

    getDiceTotal() {
        return this.diceValues.reduce((sum, value) => sum + value, 0);
    }

    calculateReward(total) {
        if (total >= 1 && total <= 5) {
            return total * 10;
        }
        if (total >= 6 && total <= 8) {
            return total * 20;
        }
        if (total >= 9 && total <= 10) {
            return total * 30;
        }
        return 0;
    }

    updateTower(total) {
        const isBust = total > 10;
        for (let level = 1; level <= TOWER_SEGMENTS; level += 1) {
            const segment = this.towerSegments[level];
            if (!segment) {
                continue;
            }
            if (!this.hasRolled || isBust) {
                segment.fill.setAlpha(0);
            } else if (total >= level) {
                segment.fill.setAlpha(0.85);
            } else {
                segment.fill.setAlpha(0);
            }
        }
    }

    updateStatusTexts(total) {
        if (this.totalText) {
            this.totalText.setText(`${total}`);
        }
        const potential = this.calculateReward(total);
        if (this.rewardText) {
            const label = total > 10 ? 'Bust: 0g' : `Potential: ${potential}g`;
            this.rewardText.setText(label);
        }
        if (this.statusText) {
            if (!this.hasRolled) {
                this.statusText.setText('Roll to begin your climb.');
            } else if (total > 10) {
                this.statusText.setText('Over 10! Cashing out now yields nothing.');
            } else if (!this.hasRerolled) {
                this.statusText.setText('Toggle dice and use your re-roll or cash out.');
            } else {
                this.statusText.setText('Re-roll used. Cash out to claim your reward.');
            }
        }
    }

    updateActionButtons() {
        const canRoll = !this.hasRolled;
        const canReroll = this.hasRolled && !this.hasRerolled;
        const canCashOut = this.hasRolled;

        this.setButtonEnabled(this.rollButton, canRoll && !this.isComplete);
        this.setButtonEnabled(this.rerollButton, canReroll && !this.isComplete);
        this.setButtonEnabled(this.cashOutButton, canCashOut && !this.isComplete);
    }

    setButtonEnabled(button, enabled) {
        if (!button || !button.background) {
            return;
        }
        const style = button.background.getData && button.background.getData('rectButtonStyle');
        if (enabled) {
            if (style) {
                button.background.setFillStyle(style.baseColor, style.baseAlpha);
                button.background.setAlpha(style.enabledAlpha);
            } else {
                button.background.setAlpha(1);
            }
            button.background.setInteractive({ useHandCursor: true });
            if (button.text) {
                button.text.setAlpha(1);
            }
        } else {
            button.background.disableInteractive();
            if (style) {
                button.background.setFillStyle(style.disabledColor, style.baseAlpha);
                button.background.setAlpha(style.disabledAlpha);
            } else {
                button.background.setAlpha(0.6);
            }
            if (button.text) {
                button.text.setAlpha(0.55);
            }
        }
    }

    finish(result = {}) {
        if (this.isComplete) {
            return;
        }
        this.isComplete = true;
        this.updateActionButtons();
        this.refreshDiceInteractivity();
        this.updateDiceCountButtons();
        this.leaveButton.background.disableInteractive();
        if (this.leaveButton.text) {
            this.leaveButton.text.setAlpha(0.55);
        }
        this.onComplete(result);
    }

    destroy() {
        if (!this.modal) {
            return;
        }
        destroyModal(this.modal);
        this.modal = null;
        this.container = null;
        this.backdrop = null;
    }
}
