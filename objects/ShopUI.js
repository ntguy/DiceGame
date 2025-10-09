const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 420;

const TITLE_STYLE = {
    fontSize: '40px',
    color: '#f1c40f',
    fontStyle: 'bold'
};

const CARD_TITLE_STYLE = {
    fontSize: '22px',
    color: '#ffffff',
    fontStyle: 'bold'
};

const CARD_DESC_STYLE = {
    fontSize: '18px',
    color: '#d0d6db',
    wordWrap: { width: 200 }
};

const COST_STYLE = {
    fontSize: '20px',
    color: '#f1c40f'
};

const STATUS_STYLE = {
    fontSize: '18px',
    color: '#2ecc71'
};

const DISABLED_ALPHA = 0.35;

export class ShopUI {
    constructor(scene, relics, callbacks = {}) {
        this.scene = scene;
        this.relics = relics;
        this.callbacks = callbacks;

        this.container = scene.add.container(0, 0).setDepth(50).setVisible(false);

        this.backdrop = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.7)
            .setOrigin(0, 0)
            .setInteractive();

        this.panel = scene.add.rectangle(scene.scale.width / 2, scene.scale.height / 2, PANEL_WIDTH, PANEL_HEIGHT, 0x101f33, 0.92)
            .setStrokeStyle(4, 0xffffff, 0.35)
            .setOrigin(0.5);

        const title = scene.add.text(scene.scale.width / 2, this.panel.y - PANEL_HEIGHT / 2 + 36, 'Shop', TITLE_STYLE)
            .setOrigin(0.5, 0);

        this.goldText = scene.add.text(scene.scale.width / 2, title.y + 52, '', {
            fontSize: '22px',
            color: '#ecf0f1'
        }).setOrigin(0.5, 0);

        this.cards = [];
        this.cardGroup = scene.add.container(this.panel.x, this.panel.y - 40);

        this.relics.forEach((relic, index) => {
            const card = this.createCard(relic, index);
            this.cards.push(card);
            this.cardGroup.add(card.container);
        });

        const leaveButton = this.createLeaveButton();

        this.container.add([this.backdrop, this.panel, title, this.goldText, this.cardGroup, leaveButton.container]);

        if (scene && scene.events) {
            scene.events.once('shutdown', this.destroy, this);
            scene.events.once('destroy', this.destroy, this);
        }
    }

    createCard(relic, index) {
        const spacing = 220;
        const startX = -spacing;
        const x = startX + spacing * index;

        const container = this.scene.add.container(x, 40);

        const background = this.scene.add.rectangle(0, 0, 200, 220, 0x142a42, 0.95)
            .setStrokeStyle(3, 0xffffff, 0.3)
            .setOrigin(0.5);

        const title = this.scene.add.text(0, -90, relic.name, CARD_TITLE_STYLE)
            .setOrigin(0.5, 0.5);

        const description = this.scene.add.text(0, -40, relic.description, CARD_DESC_STYLE)
            .setOrigin(0.5, 0.5);

        const costText = this.scene.add.text(0, 40, `${relic.cost} Gold`, COST_STYLE)
            .setOrigin(0.5, 0.5);

        const statusText = this.scene.add.text(0, 70, '', STATUS_STYLE)
            .setOrigin(0.5, 0.5);

        const button = this.scene.add.rectangle(0, 110, 160, 44, 0xf1c40f, 1)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const buttonLabel = this.scene.add.text(0, 110, 'Purchase', {
            fontSize: '20px',
            color: '#1b2631',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        button.on('pointerup', () => {
            if (button.disabled) {
                return;
            }
            if (typeof this.callbacks.onPurchase === 'function') {
                this.callbacks.onPurchase(relic);
            }
        });

        button.on('pointerover', () => {
            if (button.disabled) {
                return;
            }
            button.setFillStyle(0xffd65b, 1);
        });

        button.on('pointerout', () => {
            if (button.disabled) {
                return;
            }
            button.setFillStyle(0xf1c40f, 1);
        });

        container.add([background, title, description, costText, statusText, button, buttonLabel]);

        return {
            relic,
            container,
            background,
            title,
            description,
            costText,
            statusText,
            button,
            buttonLabel
        };
    }

    createLeaveButton() {
        const container = this.scene.add.container(this.panel.x, this.panel.y + PANEL_HEIGHT / 2 - 48);
        const button = this.scene.add.rectangle(0, 0, 180, 48, 0x2ecc71, 1)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        const label = this.scene.add.text(0, 0, 'Leave Shop', {
            fontSize: '20px',
            color: '#0b1a2b',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        button.on('pointerup', () => {
            if (typeof this.callbacks.onExit === 'function') {
                this.callbacks.onExit();
            }
        });

        button.on('pointerover', () => {
            button.setFillStyle(0x3dd384, 1);
        });

        button.on('pointerout', () => {
            button.setFillStyle(0x2ecc71, 1);
        });

        container.add([button, label]);

        return { container, button, label };
    }

    open(state) {
        this.state = state || {};
        this.updateState();
        this.container.setVisible(true);
    }

    close() {
        this.container.setVisible(false);
    }

    updateState() {
        const gold = this.state.gold || 0;
        const ownedIds = new Set(this.state.ownedRelicIds || []);
        this.goldText.setText(`Gold: ${gold}`);

        this.cards.forEach(card => {
            const isOwned = ownedIds.has(card.relic.id);
            const affordable = gold >= card.relic.cost;

            if (isOwned) {
                card.button.disabled = true;
                card.button.setFillStyle(0x95a5a6, 1);
                card.button.disableInteractive();
                card.container.setAlpha(1);
                card.statusText.setText('Owned');
                card.statusText.setColor('#2ecc71');
                card.buttonLabel.setText('Purchased');
                card.buttonLabel.setColor('#1b2631');
                return;
            }

            if (!affordable) {
                card.button.disabled = true;
                card.button.setFillStyle(0x95a5a6, 1);
                card.button.disableInteractive();
                card.container.setAlpha(DISABLED_ALPHA);
                card.statusText.setText('Not enough gold');
                card.statusText.setColor('#e74c3c');
                card.buttonLabel.setText('Purchase');
                card.buttonLabel.setColor('#1b2631');
                return;
            }

            card.button.disabled = false;
            card.button.setFillStyle(0xf1c40f, 1);
            card.button.setInteractive({ useHandCursor: true });
            card.container.setAlpha(1);
            card.statusText.setText('');
            card.buttonLabel.setText('Purchase');
            card.buttonLabel.setColor('#1b2631');
        });
    }

    destroy() {
        if (!this.container) {
            return;
        }
        this.container.destroy(true);
        this.container = null;
        this.cards = null;
        this.cardGroup = null;
        this.backdrop = null;
        this.panel = null;
        this.goldText = null;
    }
}
