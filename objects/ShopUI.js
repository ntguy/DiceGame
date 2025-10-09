import { createModal, destroyModal, createCard } from './ui/ModalComponents.js';

const PANEL_WIDTH = 880;
const PANEL_HEIGHT = 480;
const CARD_WIDTH = 250;
const CARD_HEIGHT = 260;
const CARD_GAP = 24;

export class ShopUI {
    constructor(scene, { relics = [], onPurchase, onClose }) {
        this.scene = scene;
        this.relics = relics;
        this.onPurchase = typeof onPurchase === 'function' ? onPurchase : () => false;
        this.onClose = typeof onClose === 'function' ? onClose : () => {};
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
            title: 'Relic Shop',
            titleStyle: {
                fontSize: '40px',
                color: '#f1c40f',
                fontStyle: 'bold'
            },
            subtitle: 'Relics provide permanent bonuses.',
            subtitleStyle: {
                fontSize: '22px',
                color: '#f9e79f'
            }
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        this.renderRelicCards();
        this.createLeaveButton();
    }

    renderRelicCards() {
        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        const cardSpacing = CARD_WIDTH + CARD_GAP;
        const startX = this.relics.length > 1
            ? -((this.relics.length - 1) * cardSpacing) / 2
            : 0;
        const cardY = 2;

        this.relics.forEach((relic, index) => {
            const cardX = startX + index * cardSpacing;
            const { container: cardContainer, background: cardBg } = createCard(this.scene, {
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                backgroundColor: 0x120a1a,
                backgroundAlpha: 0.95,
                strokeColor: relic.owned ? 0x7f8c8d : 0xf1c40f,
                strokeAlpha: relic.owned ? 0.6 : 0.9
            });

            cardContainer.setPosition(cardX, cardY);

            const icon = this.scene.add.text(0, -CARD_HEIGHT / 2 + 50, relic.icon || '♦', {
                fontSize: '52px'
            }).setOrigin(0.5);

            const nameText = this.scene.add.text(0, icon.y + 46, relic.name, {
                fontSize: '24px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const descText = this.scene.add.text(0, nameText.y + 28, relic.description, {
                fontSize: '16px',
                color: '#f8f9f9',
                wordWrap: { width: CARD_WIDTH - 48 }
            }).setOrigin(0.5, 0);

            const buttonY = CARD_HEIGHT / 2 - 50;
            const buttonBg = this.scene.add.rectangle(0, buttonY, CARD_WIDTH - 48, 48, 0x271438, 0.92)
                .setStrokeStyle(2, relic.owned ? 0x7f8c8d : 0xf1c40f, relic.owned ? 0.5 : 0.85)
                .setInteractive({ useHandCursor: !relic.owned && relic.canAfford });

            const label = relic.owned
                ? 'Owned'
                : relic.canAfford
                    ? `Buy (${relic.cost}g)`
                    : 'Not enough gold';

            const buttonText = this.scene.add.text(0, buttonY, label, {
                fontSize: '18px',
                color: '#f9e79f'
            }).setOrigin(0.5);

            if (relic.owned || !relic.canAfford) {
                buttonBg.setFillStyle(0x2c173a, 0.6);
                buttonText.setAlpha(0.6);
                cardBg.setAlpha(relic.owned ? 0.75 : 0.85);
                icon.setAlpha(0.85);
                nameText.setAlpha(0.85);
                descText.setAlpha(0.85);
                buttonBg.disableInteractive();
            } else {
                buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x3a1c4d, 0.95));
                buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x271438, 0.92));
                buttonBg.on('pointerup', () => {
                    const purchased = this.onPurchase(relic.id);
                    if (purchased) {
                        this.updateRelicState(relic.id, { owned: true });
                    }
                });
            }

            cardContainer.add([cardBg, icon, nameText, descText, buttonBg, buttonText]);
            this.container.add(cardContainer);
            this.cardContainers.push(cardContainer);
        });
    }

    updateRelicState(id, changes) {
        this.relics = this.relics.map(relic => relic.id === id ? { ...relic, ...changes } : relic);
        this.renderRelicCards();
    }

    updateRelics(relics) {
        this.relics = relics;
        this.renderRelicCards();
    }

    createLeaveButton() {
        const leaveY = PANEL_HEIGHT / 2 - 58;
        const leaveBg = this.scene.add.rectangle(0, leaveY, PANEL_WIDTH - 160, 58, 0x2d1b3d, 0.92)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });

        const leaveText = this.scene.add.text(0, leaveY, 'Leave Shop', {
            fontSize: '24px',
            color: '#f9e79f'
        }).setOrigin(0.5);

        leaveBg.on('pointerover', () => leaveBg.setFillStyle(0x3a2356, 0.96));
        leaveBg.on('pointerout', () => leaveBg.setFillStyle(0x2d1b3d, 0.92));
        leaveBg.on('pointerup', () => this.onClose());

        this.container.add([leaveBg, leaveText]);
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
