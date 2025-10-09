import { PATH_NODE_TYPES } from '../systems/PathManager.js';

const COLORS = {
    [PATH_NODE_TYPES.ENEMY]: 0xe74c3c,
    [PATH_NODE_TYPES.SHOP]: 0xf1c40f,
    [PATH_NODE_TYPES.MEDICAL]: 0x27ae60,
    boss: 0x9b59b6,
    completed: 0x7f8c8d
};

const ICONS = {
    [PATH_NODE_TYPES.ENEMY]: '⚔️',
    [PATH_NODE_TYPES.SHOP]: '🛒',
    [PATH_NODE_TYPES.MEDICAL]: '➕',
    boss: '🔥'
};

const LABELS = {
    legend: {
        enemy: 'Fight',
        shop: 'Shop',
        medical: 'Hospital',
        boss: 'Boss'
    }
};

const LAYOUT = {
    baseX: 160,
    baseY: 140,
    columnSpacing: 180,
    rowSpacing: 120
};

export class PathUI {
    constructor(scene, pathManager, onSelect) {
        this.scene = scene;
        this.pathManager = pathManager;
        this.onSelect = typeof onSelect === 'function' ? onSelect : () => {};

        this.container = scene.add.container(0, 0);
        this.container.setDepth(20);

        this.connectionGraphics = scene.add.graphics();
        this.connectionGraphics.setDepth(19);

        this.nodeRefs = new Map();

        this.createNodes();
        this.drawConnections();
        this.createLegend();
        this.hide();
    }

    getNodePosition(node) {
        const x = LAYOUT.baseX + (node.column || 0) * LAYOUT.columnSpacing;
        const y = LAYOUT.baseY + (node.row || 0) * LAYOUT.rowSpacing;
        return { x, y };
    }

    createNodes() {
        const nodes = this.pathManager.getNodes();
        nodes.forEach(node => {
            const { x, y } = this.getNodePosition(node);
            const container = this.scene.add.container(x, y);
            const isBoss = node.isBoss;
            const typeKey = isBoss ? 'boss' : node.type;
            const color = COLORS[typeKey] || 0xffffff;
            const icon = isBoss ? ICONS.boss : ICONS[node.type];

            const circle = this.scene.add.circle(0, 0, 28, color, 1)
                .setStrokeStyle(3, 0xffffff, 0.9)
                .setInteractive({ useHandCursor: true });

            const iconText = this.scene.add.text(0, -4, icon || '?', {
                fontSize: '24px',
                color: '#000000'
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(0, 40, node.label || '', {
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);

            container.add([circle, iconText, labelText]);
            this.container.add(container);

            circle.on('pointerdown', () => {
                if (!this.isNodeSelectable(node.id)) {
                    return;
                }
                this.onSelect(node);
            });

            this.nodeRefs.set(node.id, {
                node,
                container,
                circle,
                iconText,
                labelText,
                isBoss
            });
        });
    }

    drawConnections() {
        this.connectionGraphics.clear();
        this.connectionGraphics.lineStyle(3, 0xffffff, 0.2);

        const nodes = this.pathManager.getNodes();
        nodes.forEach(node => {
            const fromPos = this.getNodePosition(node);
            (node.connections || []).forEach(connectionId => {
                const target = this.pathManager.getNode(connectionId);
                if (!target) {
                    return;
                }
                const toPos = this.getNodePosition(target);
                this.connectionGraphics.lineBetween(fromPos.x, fromPos.y, toPos.x, toPos.y);
            });
        });
    }

    createLegend() {
        const legendContainer = this.scene.add.container(this.scene.scale.width - 140, 160);
        const header = this.scene.add.text(0, 0, 'Legend', {
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);
        legendContainer.add(header);

        const entries = [
            { key: 'enemy', color: COLORS[PATH_NODE_TYPES.ENEMY], icon: ICONS[PATH_NODE_TYPES.ENEMY], label: LABELS.legend.enemy },
            { key: 'shop', color: COLORS[PATH_NODE_TYPES.SHOP], icon: ICONS[PATH_NODE_TYPES.SHOP], label: LABELS.legend.shop },
            { key: 'medical', color: COLORS[PATH_NODE_TYPES.MEDICAL], icon: ICONS[PATH_NODE_TYPES.MEDICAL], label: LABELS.legend.medical },
            { key: 'boss', color: COLORS.boss, icon: ICONS.boss, label: LABELS.legend.boss }
        ];

        entries.forEach((entry, index) => {
            const y = 40 + index * 48;
            const circle = this.scene.add.circle(-50, y, 18, entry.color, 1)
                .setStrokeStyle(2, 0xffffff, 0.8);
            const icon = this.scene.add.text(-50, y, entry.icon, {
                fontSize: '20px',
                color: '#000000'
            }).setOrigin(0.5);
            const label = this.scene.add.text(-10, y, entry.label, {
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);
            legendContainer.add(circle);
            legendContainer.add(icon);
            legendContainer.add(label);
        });

        this.legendContainer = legendContainer;
        this.legendContainer.setDepth(20);
    }

    isNodeSelectable(nodeId) {
        const availableIds = this.pathManager.getAvailableNodeIds();
        return availableIds.includes(nodeId);
    }

    updateState() {
        const availableIds = new Set(this.pathManager.getAvailableNodeIds());
        const currentId = this.pathManager.getCurrentNodeId();

        this.nodeRefs.forEach(({ node, circle, iconText, labelText, isBoss }) => {
            const typeKey = isBoss ? 'boss' : node.type;
            const color = COLORS[typeKey] || 0xffffff;
            const isCompleted = this.pathManager.isNodeCompleted(node.id);
            const isLocked = this.pathManager.isNodeLocked(node.id);
            const isCurrent = currentId === node.id;

            circle.setFillStyle(color, 1);

            if (isCurrent) {
                circle.setAlpha(1);
                iconText.setAlpha(1);
                labelText.setAlpha(1);
                circle.setStrokeStyle(4, 0xffffff, 1);
                circle.setScale(1.05);
                circle.disableInteractive();
            } else if (isCompleted) {
                circle.setAlpha(0.35);
                iconText.setAlpha(0.45);
                labelText.setAlpha(0.45);
                circle.setStrokeStyle(2, 0xffffff, 0.4);
                circle.setScale(1);
                circle.disableInteractive();
            } else if (availableIds.has(node.id)) {
                circle.setAlpha(1);
                iconText.setAlpha(1);
                labelText.setAlpha(1);
                circle.setStrokeStyle(4, 0xffffff, 1);
                circle.setScale(isCurrent ? 1.05 : 1);
                circle.setInteractive({ useHandCursor: true });
            } else if (isLocked) {
                circle.setAlpha(0.15);
                iconText.setAlpha(0.25);
                labelText.setAlpha(0.25);
                circle.setStrokeStyle(2, 0xffffff, 0.25);
                circle.setScale(1);
                circle.disableInteractive();
            } else {
                circle.setAlpha(0.25);
                iconText.setAlpha(0.4);
                labelText.setAlpha(0.4);
                circle.setStrokeStyle(2, 0xffffff, 0.45);
                circle.setScale(1);
                circle.disableInteractive();
            }
        });
    }

    show() {
        this.container.setVisible(true);
        this.connectionGraphics.setVisible(true);
        if (this.legendContainer) {
            this.legendContainer.setVisible(true);
        }
    }

    hide() {
        this.container.setVisible(false);
        this.connectionGraphics.setVisible(false);
        if (this.legendContainer) {
            this.legendContainer.setVisible(false);
        }
    }
}
