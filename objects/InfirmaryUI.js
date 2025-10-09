const PANEL_WIDTH = 540;
const PANEL_HEIGHT = 420;
const OPTION_HEIGHT = 90;

export class InfirmaryUI {
    constructor(scene, { onHealHalf, onIncreaseMax, onHealFull, healFullCost = 0, canAffordFull = false }) {
        this.scene = scene;
        this.onHealHalf = typeof onHealHalf === 'function' ? onHealHalf : () => {};
        this.onIncreaseMax = typeof onIncreaseMax === 'function' ? onIncreaseMax : () => {};
        this.onHealFull = typeof onHealFull === 'function' ? onHealFull : () => {};
        this.healFullCost = healFullCost;
        this.canAffordFull = canAffordFull;
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

        const panel = this.scene.add.rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x172026, 0.92)
            .setStrokeStyle(4, 0x2ecc71, 0.9);

        const title = this.scene.add.text(0, -PANEL_HEIGHT / 2 + 40, 'Infirmary', {
            fontSize: '36px',
            color: '#2ecc71',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        const subtitle = this.scene.add.text(0, title.y + 40, 'Choose a treatment to continue', {
            fontSize: '20px',
            color: '#d5f5e3'
        }).setOrigin(0.5, 0.5);

        this.container.add([panel, title, subtitle]);

        const optionStartY = subtitle.y + 70;

        this.createOption({
            y: optionStartY,
            title: 'Patch Up',
            description: 'Recover half of your missing health for free.',
            accentColor: 0x58d68d,
            onClick: () => this.onHealHalf()
        });

        this.createOption({
            y: optionStartY + OPTION_HEIGHT + 16,
            title: 'Reinforce',
            description: 'Increase max health by 10% (no healing).',
            accentColor: 0x2ecc71,
            onClick: () => this.onIncreaseMax()
        });

        const healFullDescription = this.healFullCost > 0
            ? `Pay ${this.healFullCost} gold to heal to full.`
            : 'Already at full health!';

        this.createOption({
            y: optionStartY + (OPTION_HEIGHT + 16) * 2,
            title: 'Full Restoration',
            description: healFullDescription,
            accentColor: 0xf1c40f,
            onClick: () => {
                if (this.canAffordFull && this.healFullCost > 0) {
                    this.onHealFull();
                }
            },
            disabled: !this.canAffordFull || this.healFullCost <= 0
        });
    }

    createOption({ y, title, description, accentColor, onClick, disabled = false }) {
        const buttonWidth = PANEL_WIDTH - 80;
        const bg = this.scene.add.rectangle(0, y, buttonWidth, OPTION_HEIGHT, 0x0b1418, 0.85)
            .setStrokeStyle(2, accentColor, 0.8)
            .setInteractive({ useHandCursor: !disabled });

        const titleText = this.scene.add.text(-buttonWidth / 2 + 20, y - 16, title, {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const descText = this.scene.add.text(-buttonWidth / 2 + 20, y + 18, description, {
            fontSize: '18px',
            color: '#c8f7c5'
        }).setOrigin(0, 0.5);

        if (disabled) {
            bg.setAlpha(0.35);
            titleText.setAlpha(0.4);
            descText.setAlpha(0.4);
            bg.disableInteractive();
        } else {
            bg.on('pointerover', () => {
                bg.setFillStyle(0x102027, 0.95);
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(0x0b1418, 0.85);
            });
            bg.on('pointerup', () => {
                onClick();
            });
        }

        this.container.add([bg, titleText, descText]);
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
    }
}
