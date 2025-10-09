const PANEL_WIDTH = 560;
const PANEL_HEIGHT = 380;

const TITLE_STYLE = {
    fontSize: '38px',
    color: '#f1c40f',
    fontStyle: 'bold'
};

const OPTION_TITLE_STYLE = {
    fontSize: '22px',
    color: '#ffffff',
    fontStyle: 'bold'
};

const OPTION_DESC_STYLE = {
    fontSize: '18px',
    color: '#d5d8dc',
    wordWrap: { width: PANEL_WIDTH - 120 }
};

const COST_STYLE = {
    fontSize: '20px',
    color: '#f1c40f'
};

const DISABLED_ALPHA = 0.35;

export class InfirmaryUI {
    constructor(scene, callbacks = {}) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = scene.add.container(0, 0).setDepth(50).setVisible(false);

        this.backdrop = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.7)
            .setOrigin(0, 0)
            .setInteractive();

        this.panel = scene.add.rectangle(scene.scale.width / 2, scene.scale.height / 2, PANEL_WIDTH, PANEL_HEIGHT, 0x0b1a2b, 0.92)
            .setStrokeStyle(4, 0xffffff, 0.35)
            .setOrigin(0.5);

        const title = scene.add.text(scene.scale.width / 2, scene.scale.height / 2 - PANEL_HEIGHT / 2 + 40, 'Infirmary', TITLE_STYLE)
            .setOrigin(0.5, 0);

        this.statsText = scene.add.text(scene.scale.width / 2, title.y + 64, '', {
            fontSize: '20px',
            color: '#ecf0f1'
        }).setOrigin(0.5, 0);

        this.optionContainers = [];

        const optionConfigs = [
            {
                key: 'half-heal',
                title: 'Mend Wounds',
                description: 'Heal halfway to full health for free.',
                onSelect: () => this.handleHalfHeal()
            },
            {
                key: 'max-boost',
                title: 'Fortify Frame',
                description: 'Increase your max health by 10% for free (no healing).',
                onSelect: () => this.handleMaxHealthBoost()
            },
            {
                key: 'full-heal',
                title: 'Total Restoration',
                description: 'Pay to fully restore health. Cost is 10 gold per health restored.',
                onSelect: () => this.handleFullHeal()
            }
        ];

        optionConfigs.forEach((config, index) => {
            const option = this.createOption(config, index);
            this.optionContainers.push(option);
        });

        this.container.add([this.backdrop, this.panel, title, this.statsText]);
        this.optionContainers.forEach(option => {
            this.container.add(option.container);
        });

        if (scene && scene.events) {
            scene.events.once('shutdown', this.destroy, this);
            scene.events.once('destroy', this.destroy, this);
        }
    }

    createOption(config, index) {
        const centerX = this.scene.scale.width / 2;
        const top = this.scene.scale.height / 2 - PANEL_HEIGHT / 2 + 140;
        const offsetY = index * 90;

        const container = this.scene.add.container(centerX, top + offsetY);

        const background = this.scene.add.rectangle(0, 0, PANEL_WIDTH - 60, 78, 0x10263d, 0.95)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffffff, 0.2)
            .setInteractive({ useHandCursor: true });

        const title = this.scene.add.text(- (PANEL_WIDTH - 60) / 2 + 16, -24, config.title, OPTION_TITLE_STYLE)
            .setOrigin(0, 0);

        const description = this.scene.add.text(title.x, title.y + 30, config.description, OPTION_DESC_STYLE)
            .setOrigin(0, 0);

        const costText = this.scene.add.text((PANEL_WIDTH - 60) / 2 - 16, 0, '', COST_STYLE)
            .setOrigin(1, 0.5);

        background.on('pointerup', () => {
            if (background.disabled) {
                return;
            }
            if (typeof config.onSelect === 'function') {
                config.onSelect();
            }
        });

        background.on('pointerover', () => {
            if (background.disabled) {
                return;
            }
            background.setFillStyle(0x123049, 0.95);
        });

        background.on('pointerout', () => {
            background.setFillStyle(0x10263d, 0.95);
        });

        container.add([background, title, description, costText]);

        return {
            key: config.key,
            container,
            background,
            title,
            description,
            costText
        };
    }

    open(state) {
        this.state = state || {};
        this.updateStateTexts();
        this.container.setVisible(true);
    }

    close() {
        this.container.setVisible(false);
    }

    updateStateTexts() {
        const current = this.state.currentHealth || 0;
        const max = this.state.maxHealth || 0;
        this.statsText.setText(`Health: ${current} / ${max}    Gold: ${this.state.gold || 0}`);

        const missing = Math.max(0, max - current);
        const halfMissing = Math.ceil(missing / 2);
        const fullCost = missing * 10;

        this.optionContainers.forEach(option => {
            switch (option.key) {
                case 'half-heal':
                    option.costText.setText(halfMissing > 0 ? `+${halfMissing} HP` : 'Full health');
                    this.setOptionDisabled(option, missing === 0);
                    break;
                case 'max-boost':
                    option.costText.setText('+10% Max HP');
                    this.setOptionDisabled(option, false);
                    break;
                case 'full-heal':
                    option.costText.setText(fullCost > 0 ? `${fullCost} Gold` : 'Full health');
                    this.setOptionDisabled(option, fullCost === 0 || (this.state.gold || 0) < fullCost);
                    break;
                default:
                    break;
            }
        });
    }

    setOptionDisabled(option, disabled) {
        option.background.disabled = disabled;
        if (disabled) {
            option.background.disableInteractive();
        } else {
            option.background.setInteractive({ useHandCursor: true });
        }
        option.container.setAlpha(disabled ? DISABLED_ALPHA : 1);
    }

    handleHalfHeal() {
        if (typeof this.callbacks.onHalfHeal === 'function') {
            this.callbacks.onHalfHeal();
        }
    }

    handleMaxHealthBoost() {
        if (typeof this.callbacks.onMaxHealthBoost === 'function') {
            this.callbacks.onMaxHealthBoost();
        }
    }

    handleFullHeal() {
        if (typeof this.callbacks.onFullHeal === 'function') {
            this.callbacks.onFullHeal();
        }
    }

    destroy() {
        if (!this.container) {
            return;
        }
        this.container.destroy(true);
        this.container = null;
        this.optionContainers = null;
        this.statsText = null;
        this.panel = null;
        this.backdrop = null;
    }
}
