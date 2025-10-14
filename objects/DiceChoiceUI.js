import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';
import { CONSTANTS } from '../config.js';
import { getDieName, getDieDescription, getDieEmoji, getDieUpgradeDescription, cloneDieState } from '../systems/CustomDiceLogic.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 520;
const CARD_WIDTH = 260;
const CARD_HEIGHT = 280;
const CARD_GAP = 26;

export class DiceChoiceUI {
    constructor(scene, { options = [], onSelect, onSkip } = {}) {
        this.scene = scene;
        this.options = Array.isArray(options) ? options.map(option => cloneDieState(option)) : [];
        this.onSelect = typeof onSelect === 'function' ? onSelect : () => {};
        this.onSkip = typeof onSkip === 'function' ? onSkip : () => {};
        this.cardContainers = [];
        this.isDestroyed = false;

        this.create();
    }

    create() {
        const modal = createModal(this.scene, {
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
            panelColor: 0x1a1326,
            panelAlpha: 0.95,
            strokeColor: 0xf1c40f,
            strokeAlpha: 0.9,
            title: 'Choose a Die',
            titleStyle: {
                fontSize: '40px',
                color: '#f1c40f',
                fontStyle: 'bold'
            },
            subtitle: 'Select one die to add to your collection.',
            subtitleStyle: {
                fontSize: '22px',
                color: '#f9e79f'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.renderOptionCards();
        this.createSkipButton();
    }

    renderOptionCards() {
        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        const spacing = CARD_WIDTH + CARD_GAP;
        const startX = this.options.length > 1
            ? -((this.options.length - 1) * spacing) / 2
            : 0;
        const cardY = 12;

        this.options.forEach((option, index) => {
            const x = startX + index * spacing;
            const { container: cardContainer, background: cardBackground } = createCard(this.scene, {
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                backgroundColor: 0x120a1a,
                backgroundAlpha: 0.95,
                strokeColor: 0xf1c40f,
                strokeAlpha: 0.9
            });

            cardContainer.setPosition(x, cardY);

            const emoji = this.scene.add.text(0, -CARD_HEIGHT / 2 + 54, getDieEmoji(option) || '🎲', {
                fontSize: '58px',
                padding: CONSTANTS.EMOJI_TEXT_PADDING
            }).setOrigin(0.5);

            const nameText = this.scene.add.text(0, emoji.y + 48, getDieName(option), {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const description = getDieDescription(option);
            const upgrade = getDieUpgradeDescription(option);

            const descLines = [description];
            if (upgrade && upgrade !== description) {
                descLines.push(`Upgrade: ${upgrade}`);
            }

            const descText = this.scene.add.text(0, nameText.y + 30, descLines.join('\n'), {
                fontSize: '16px',
                color: '#f8f9f9',
                wordWrap: { width: CARD_WIDTH - 48 }
            }).setOrigin(0.5, 0);

            const buttonY = CARD_HEIGHT / 2 - 50;
            const buttonBg = this.scene.add.rectangle(0, buttonY, CARD_WIDTH - 48, 48, 0x271438, 0.92)
                .setStrokeStyle(2, 0xf1c40f, 0.85)
                .setInteractive({ useHandCursor: true });

            const buttonText = this.scene.add.text(0, buttonY, 'Choose', {
                fontSize: '18px',
                color: '#f9e79f'
            }).setOrigin(0.5);

            applyRectangleButtonStyle(buttonBg, {
                baseColor: 0x271438,
                baseAlpha: 0.92,
                hoverBlend: 0.18,
                pressBlend: 0.32,
                disabledBlend: 0.5,
                enabledAlpha: 1,
                disabledAlpha: 0.45
            });

            buttonBg.on('pointerup', () => {
                this.onSelect(cloneDieState(option));
            });

            cardContainer.add([cardBackground, emoji, nameText, descText, buttonBg, buttonText]);
            this.container.add(cardContainer);
            this.cardContainers.push(cardContainer);
        });
    }

    createSkipButton() {
        const skipY = PANEL_HEIGHT / 2 - 62;
        const skipBg = this.scene.add.rectangle(0, skipY, PANEL_WIDTH - 180, 56, 0x2d1b3d, 0.92)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });

        const skipText = this.scene.add.text(0, skipY, 'Skip', {
            fontSize: '22px',
            color: '#f9e79f'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(skipBg, {
            baseColor: 0x2d1b3d,
            baseAlpha: 0.92,
            hoverBlend: 0.18,
            pressBlend: 0.32,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });

        skipBg.on('pointerup', () => {
            this.onSkip();
        });

        this.container.add([skipBg, skipText]);
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;

        destroyModal(this.modal);
        this.modal = null;
        this.cardContainers = [];
    }
}
