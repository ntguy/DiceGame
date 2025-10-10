import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';
import { CONSTANTS } from '../config.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 480;
const CARD_WIDTH = 250;
const CARD_HEIGHT = 250;
const CARD_GAP = 24;

export class InfirmaryUI {
    constructor(scene, { onHealHalf, onIncreaseMax, onHealFull, healFullCost = 0, canAffordFull = false }) {
        this.scene = scene;
        this.onHealHalf = typeof onHealHalf === 'function' ? onHealHalf : () => {};
        this.onIncreaseMax = typeof onIncreaseMax === 'function' ? onIncreaseMax : () => {};
        this.onHealFull = typeof onHealFull === 'function' ? onHealFull : () => {};
        this.healFullCost = healFullCost;
        this.canAffordFull = canAffordFull;
        this.isDestroyed = false;
        this.optionCards = [];

        this.create();
    }

    create() {
        const modal = createModal(this.scene, {
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
            panelColor: 0x142126,
            panelAlpha: 0.95,
            strokeColor: 0x2ecc71,
            strokeAlpha: 0.9,
            title: 'Infirmary',
            titleStyle: {
                fontSize: '40px',
                color: '#2ecc71',
                fontStyle: 'bold'
            },
            subtitle: 'Choose a treatment to continue',
            subtitleStyle: {
                fontSize: '22px',
                color: '#d5f5e3'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.renderOptions();
    }

    renderOptions() {
        this.optionCards.forEach(card => card.destroy(true));
        this.optionCards = [];

        const options = [
            {
                title: 'Patch',
                description: 'Recover half of your missing health.',
                accentColor: 0x58d68d,
                icon: '🩹',
                buttonLabel: 'Use',
                onClick: () => this.onHealHalf()
            },
            {
                title: 'Fortify',
                description: 'Increase max health by 10%.',
                accentColor: 0x2ecc71,
                icon: '🧬',
                buttonLabel: 'Use',
                onClick: () => this.onIncreaseMax()
            },
            {
                title: 'Full Restore',
                description: this.healFullCost > 0
                    ? `Pay ${this.healFullCost} gold to fully heal.`
                    : 'Already at full health!',
                accentColor: 0xf1c40f,
                icon: '❤️',
                buttonLabel: this.healFullCost > 0 ? `Heal (${this.healFullCost}g)` : 'Healed',
                onClick: () => {
                    if (this.canAffordFull && this.healFullCost > 0) {
                        this.onHealFull();
                    }
                },
                disabled: !this.canAffordFull || this.healFullCost <= 0
            }
        ];

        const cardSpacing = CARD_WIDTH + CARD_GAP;
        const startX = -cardSpacing;
        const cardY = 36;

        options.forEach((option, index) => {
            const cardX = startX + index * cardSpacing;
            const card = this.createOptionCard({ ...option, x: cardX, y: cardY });
            this.optionCards.push(card);
        });
    }

    createOptionCard({ x, y, title, description, accentColor, onClick, disabled = false, icon = '✚', buttonLabel = 'Select' }) {
        const { container: cardContainer, background: cardBg } = createCard(this.scene, {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            backgroundColor: 0x0b1a1f,
            backgroundAlpha: 0.9,
            strokeColor: accentColor,
            strokeAlpha: 0.85
        });

        cardContainer.setPosition(x, y);

        const iconText = this.scene.add.text(0, -CARD_HEIGHT / 2 + 44, icon, {
            fontSize: '48px',
            padding: CONSTANTS.EMOJI_TEXT_PADDING
        }).setOrigin(0.5);

        const titleText = this.scene.add.text(0, iconText.y + 46, title, {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const descText = this.scene.add.text(0, titleText.y + 24, description, {
            fontSize: '16px',
            color: '#c8f7c5',
            align: 'center',
            wordWrap: { width: CARD_WIDTH - 40 }
        }).setOrigin(0.5, 0);

        const buttonY = CARD_HEIGHT / 2 - 48;
        const buttonBg = this.scene.add.rectangle(0, buttonY, CARD_WIDTH - 48, 48, 0x102b31, 0.9)
            .setStrokeStyle(2, accentColor, 0.8)
            .setInteractive({ useHandCursor: !disabled });

        const buttonText = this.scene.add.text(0, buttonY, buttonLabel, {
            fontSize: '18px',
            color: '#e8fff4'
        }).setOrigin(0.5);

        if (disabled) {
            cardBg.setAlpha(0.7);
            iconText.setAlpha(0.6);
            titleText.setAlpha(0.65);
            descText.setAlpha(0.65);
            buttonBg.setFillStyle(0x1a353b, 0.75);
            buttonText.setAlpha(0.6);
            buttonBg.disableInteractive();
        } else {
            applyRectangleButtonStyle(buttonBg, {
                baseColor: 0x102b31,
                baseAlpha: 0.9,
                hoverBlend: 0.18,
                pressBlend: 0.32,
                disabledBlend: 0.5,
                enabledAlpha: 1,
                disabledAlpha: 0.45
            });
            buttonBg.on('pointerup', () => onClick());
        }

        cardContainer.add([cardBg, iconText, titleText, descText, buttonBg, buttonText]);
        this.container.add(cardContainer);

        return cardContainer;
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;

        destroyModal(this.modal);
        this.modal = null;
        this.optionCards = [];
    }
}
