const LABEL_STYLE = {
    fontSize: '26px',
    color: '#f5f5f5',
    fontStyle: 'bold'
};

const RELIC_NAME_STYLE = {
    fontSize: '18px',
    color: '#ffffff'
};

export class RelicDisplay {
    constructor(scene) {
        this.scene = scene;
        this.relics = [];
        this.container = scene.add.container(0, 0);
        this.container.setDepth(19);

        const anchorX = scene.scale.width - 210;
        const anchorY = 180;

        this.background = scene.add.rectangle(anchorX, anchorY + 50, 260, 140, 0x000000, 0.35)
            .setOrigin(1, 0)
            .setStrokeStyle(2, 0xffffff, 0.2);

        this.title = scene.add.text(anchorX, anchorY, 'Relics', LABEL_STYLE)
            .setOrigin(1, 0);

        this.gridContainer = scene.add.container(anchorX, anchorY + 44);

        this.container.add([this.background, this.title, this.gridContainer]);

        if (scene && scene.events) {
            scene.events.once('shutdown', this.destroy, this);
            scene.events.once('destroy', this.destroy, this);
        }
    }

    setRelics(relics) {
        this.relics = Array.isArray(relics) ? [...relics] : [];
        this.refresh();
    }

    refresh() {
        this.gridContainer.removeAll(true);

        if (this.relics.length === 0) {
            const emptyText = this.scene.add.text(0, 0, 'No relics yet', {
                fontSize: '16px',
                color: '#bfc9ca'
            }).setOrigin(1, 0);
            this.gridContainer.add(emptyText);
            this.background.setVisible(false);
            return;
        }

        this.background.setVisible(true);

        const maxColumns = 1;
        const itemSpacingY = 32;

        this.relics.forEach((relic, index) => {
            const row = Math.floor(index / maxColumns);
            const y = row * itemSpacingY;
            const text = this.scene.add.text(0, y, `• ${relic.name}`, RELIC_NAME_STYLE)
                .setOrigin(1, 0);
            this.gridContainer.add(text);
        });
    }

    setVisible(visible) {
        if (this.container) {
            this.container.setVisible(visible);
        }
    }

    destroy() {
        if (!this.container) {
            return;
        }
        this.container.destroy(true);
        this.container = null;
        this.gridContainer = null;
        this.title = null;
        this.background = null;
    }
}
