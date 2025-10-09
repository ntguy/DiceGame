const PANEL_WIDTH = 680;
const PANEL_HEIGHT = 460;
const CARD_WIDTH = 190;
const CARD_HEIGHT = 240;

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
        const { width, height } = this.scene.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        this.backdrop = this.scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.55)
            .setDepth(38)
            .setInteractive({ useHandCursor: false });

        this.container = this.scene.add.container(centerX, centerY);
        this.container.setDepth(40);

        const panel = this.scene.add.rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x1a1326, 0.93)
            .setStrokeStyle(4, 0xf1c40f, 0.9);

        const title = this.scene.add.text(0, -PANEL_HEIGHT / 2 + 42, 'Relic Shop', {
            fontSize: '36px',
            color: '#f1c40f',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        const subtitle = this.scene.add.text(0, title.y + 40, 'Each relic costs 100 gold', {
            fontSize: '20px',
            color: '#f9e79f'
        }).setOrigin(0.5, 0.5);

        this.container.add([panel, title, subtitle]);

        this.renderRelicCards();
        this.createLeaveButton();
    }

    renderRelicCards() {
        this.cardContainers.forEach(container => container.destroy(true));
        this.cardContainers = [];

        const startX = -(CARD_WIDTH + 30);
        const cardY = -30;

        this.relics.forEach((relic, index) => {
            const cardX = startX + index * (CARD_WIDTH + 30);
            const cardContainer = this.scene.add.container(cardX, cardY);
            const cardBg = this.scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x120a1a, 0.9)
                .setStrokeStyle(2, relic.owned ? 0x7f8c8d : 0xf1c40f, 0.8);

            const icon = this.scene.add.text(0, -CARD_HEIGHT / 2 + 50, relic.icon || '♦', {
                fontSize: '48px'
            }).setOrigin(0.5);

            const nameText = this.scene.add.text(0, icon.y + 44, relic.name, {
                fontSize: '22px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            const descText = this.scene.add.text(0, nameText.y + 30, relic.description, {
                fontSize: '16px',
                color: '#f8f9f9',
                wordWrap: { width: CARD_WIDTH - 40 }
            }).setOrigin(0.5, 0);

            const buttonY = CARD_HEIGHT / 2 - 50;
            const buttonBg = this.scene.add.rectangle(0, buttonY, CARD_WIDTH - 40, 46, 0x271438, 0.9)
                .setStrokeStyle(2, 0xf1c40f, 0.8)
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
                buttonBg.setAlpha(0.35);
                buttonText.setAlpha(0.55);
                buttonBg.disableInteractive();
            } else {
                buttonBg.on('pointerover', () => buttonBg.setFillStyle(0x3a1c4d, 0.95));
                buttonBg.on('pointerout', () => buttonBg.setFillStyle(0x271438, 0.9));
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
        const leaveY = PANEL_HEIGHT / 2 - 50;
        const leaveBg = this.scene.add.rectangle(0, leaveY, PANEL_WIDTH - 140, 56, 0x2d1b3d, 0.9)
            .setStrokeStyle(2, 0xf1c40f, 0.8)
            .setInteractive({ useHandCursor: true });

        const leaveText = this.scene.add.text(0, leaveY, 'Leave Shop', {
            fontSize: '22px',
            color: '#f9e79f'
        }).setOrigin(0.5);

        leaveBg.on('pointerover', () => leaveBg.setFillStyle(0x3a2356, 0.95));
        leaveBg.on('pointerout', () => leaveBg.setFillStyle(0x2d1b3d, 0.9));
        leaveBg.on('pointerup', () => this.onClose());

        this.container.add([leaveBg, leaveText]);
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;

        if (this.backdrop) {
            this.backdrop.destroy();
            this.backdrop = null;
        }

        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        this.cardContainers = [];
    }
}
