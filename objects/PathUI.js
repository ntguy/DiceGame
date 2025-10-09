import { PATH_NODE_TYPES } from '../systems/PathManager.js';

const COLORS = {
    [PATH_NODE_TYPES.ENEMY]: 0xe74c3c,
    [PATH_NODE_TYPES.SHOP]: 0xf1c40f,
    [PATH_NODE_TYPES.INFIRMARY]: 0x27ae60,
    boss: 0x9b59b6,
    completed: 0x7f8c8d
};

const ICONS = {
    [PATH_NODE_TYPES.ENEMY]: '⚔️',
    [PATH_NODE_TYPES.SHOP]: '🛒',
    [PATH_NODE_TYPES.INFIRMARY]: '🏥',
    boss: '🔥'
};

const LAYOUT = {
    baseY: 140,
    columnSpacing: 220,
    rowSpacing: 120
};

const DRAG_THRESHOLD = 6;
const TOP_MARGIN = 80;
const BOTTOM_MARGIN = 80;
const WHEEL_SCROLL_MULTIPLIER = 0.5;

function blendColor(base, mix, amount = 0.5) {
    const clamped = Phaser.Math.Clamp(amount, 0, 1);
    const baseColor = Phaser.Display.Color.ValueToColor(base);
    const mixColor = Phaser.Display.Color.ValueToColor(mix);

    const r = Phaser.Math.Linear(baseColor.red, mixColor.red, clamped);
    const g = Phaser.Math.Linear(baseColor.green, mixColor.green, clamped);
    const b = Phaser.Math.Linear(baseColor.blue, mixColor.blue, clamped);

    return Phaser.Display.Color.GetColor(r, g, b);
}

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
        this.isActive = false;
        this.isDragging = false;
        this.dragPointerId = null;
        this.dragStartY = 0;
        this.scrollStartY = 0;
        this.scrollY = 0;
        this.minScrollY = 0;
        this.maxScrollY = 0;
        this.minContentY = 0;
        this.maxContentY = 0;
        this.isDestroyed = false;

        this.createNodes();
        this.drawConnections();
        this.updateScrollBounds();
        this.applyScroll();
        this.setupInputHandlers();
        if (this.scene && this.scene.events) {
            this.scene.events.once('shutdown', this.destroy, this);
            this.scene.events.once('destroy', this.destroy, this);
        }
        this.hide();
    }

    getNodePosition(node) {
        const columnIndex = typeof node.column === 'number' ? node.column : 1;
        const offsetFromCenter = (columnIndex - 1) * LAYOUT.columnSpacing;
        const centerX = this.scene.scale.width / 2;
        const x = centerX + offsetFromCenter;
        const y = LAYOUT.baseY + (node.row || 0) * LAYOUT.rowSpacing;
        return { x, y };
    }

    createNodes() {
        const nodes = this.pathManager.getNodes();
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        nodes.forEach(node => {
            const { x, y } = this.getNodePosition(node);
            const container = this.scene.add.container(x, y);
            const isBoss = node.isBoss;
            const typeKey = isBoss ? 'boss' : node.type;
            const color = COLORS[typeKey] || 0xffffff;
            const icon = isBoss ? ICONS.boss : ICONS[node.type];

            const cube = this.scene.add.rectangle(0, 0, 56, 56, color, 1)
                .setStrokeStyle(3, 0xffffff, 0.9)
                .setInteractive({ useHandCursor: true })
                .setAngle(45);

            // hover handlers: only effective when cube is interactive (setInteractive only for selectable nodes)
            cube.on('pointerover', () => {
            if (!this.isNodeSelectable(node.id)) return;
                cube.setStrokeStyle(4, 0x111111, 1); // change stroke color & width on hover
            });
        
            cube.on('pointerout', () => {
                this.updateState();
            });

            const iconText = this.scene.add.text(0, 0, icon || '?', {
                fontSize: '24px',
                color: '#000000'
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(0, 50, node.label || '', {
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);

            container.add([cube, iconText, labelText]);
            this.container.add(container);

            cube.on('pointerup', pointer => {
                if (!this.isNodeSelectable(node.id)) {
                    return;
                }

                const distance = Phaser.Math.Distance.Between(
                    pointer.downX,
                    pointer.downY,
                    pointer.upX,
                    pointer.upY
                );

                if (distance > DRAG_THRESHOLD) {
                    return;
                }

                this.onSelect(node);
            });

            this.nodeRefs.set(node.id, {
                node,
                container,
                cube,
                iconText,
                labelText,
                isBoss
            });

            const top = y - 40;
            const bottom = y + 40 + 24;
            minY = Math.min(minY, top);
            maxY = Math.max(maxY, bottom);
        });

        if (nodes.length > 0) {
            this.minContentY = minY;
            this.maxContentY = maxY;
        } else {
            this.minContentY = 0;
            this.maxContentY = 0;
        }
    }

    drawConnections() {
        this.connectionGraphics.clear();
        this.connectionGraphics.lineStyle(3, 0xffffff, 0.12);

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

    isNodeSelectable(nodeId) {
        const availableIds = this.pathManager.getAvailableNodeIds();
        return availableIds.includes(nodeId);
    }

    updateState() {
        const availableIds = new Set(this.pathManager.getAvailableNodeIds());
        const currentId = this.pathManager.getCurrentNodeId();

        this.nodeRefs.forEach(({ node, cube, iconText, labelText, isBoss }) => {
            const typeKey = isBoss ? 'boss' : node.type;
            const baseColor = COLORS[typeKey] || 0xffffff;
            const isCompleted = this.pathManager.isNodeCompleted(node.id);
            const isCurrent = currentId === node.id;

            let fillColor = baseColor;
            let strokeWidth = 4;
            let strokeAlpha = 1;
            let strokeColor = 0xffffff;
            let iconAlpha = 1;
            let labelAlpha = 1;
            let scale = 1;
            let interactive = false;

            if (isCurrent) {
                scale = 1.05;
            } else if (isCompleted) {
                fillColor = blendColor(baseColor, 0x1f2a30, 0.55);
                strokeWidth = 6;
                iconAlpha = 0.6;
                labelAlpha = 0.65;
                strokeColor = 0x1f1f1f;
            } else if (availableIds.has(node.id)) {
                interactive = true;
            } else {
                fillColor = blendColor(baseColor, 0x90a4ae, 0.6);
                strokeWidth = 2;
                strokeAlpha = 0.5;
                iconAlpha = 0.8;
                labelAlpha = 0.8;
            }

            cube.setFillStyle(fillColor, 1);
            cube.setAlpha(1);
            iconText.setAlpha(iconAlpha);
            labelText.setAlpha(labelAlpha);
            cube.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
            cube.setScale(scale);

            if (interactive) {
                cube.setInteractive({ useHandCursor: true });
            } else {
                cube.disableInteractive();
            }
        });
    }

    show() {
        this.isActive = true;
        this.updateScrollBounds();
        this.applyScroll();
        this.container.setVisible(true);
        this.connectionGraphics.setVisible(true);
    }

    hide() {
        this.isActive = false;
        this.isDragging = false;
        this.dragPointerId = null;
        this.container.setVisible(false);
        this.connectionGraphics.setVisible(false);
    }

    setupInputHandlers() {
        if (!this.scene || !this.scene.input) {
            return;
        }

        this.scene.input.on('wheel', this.handleWheel, this);
        this.scene.input.on('pointerdown', this.handlePointerDown, this);
        this.scene.input.on('pointermove', this.handlePointerMove, this);
        this.scene.input.on('pointerup', this.handlePointerUp, this);
        this.scene.input.on('pointerupoutside', this.handlePointerUp, this);
    }

    handleWheel(deltaY) {
        if (!this.isActive) {
            return;
        }

        const delta = -deltaY * WHEEL_SCROLL_MULTIPLIER;
        this.setScrollY(this.scrollY + delta);
    }

    handlePointerDown(pointer) {
        if (!this.isActive || !pointer.isDown) {
            return;
        }

        if (pointer.pointerType === 'mouse' && !pointer.leftButtonDown()) {
            return;
        }

        this.isDragging = true;
        this.dragPointerId = pointer.id;
        this.dragStartY = pointer.y;
        this.scrollStartY = this.scrollY;
    }

    handlePointerMove(pointer) {
        if (!this.isActive || !this.isDragging || pointer.id !== this.dragPointerId) {
            return;
        }

        const deltaY = pointer.y - this.dragStartY;
        this.setScrollY(this.scrollStartY + deltaY);
    }

    handlePointerUp(pointer) {
        if (pointer && pointer.id !== this.dragPointerId) {
            return;
        }

        this.isDragging = false;
        this.dragPointerId = null;
    }

    setScrollY(offset) {
        const clamped = Phaser.Math.Clamp(offset, this.minScrollY, this.maxScrollY);
        this.scrollY = clamped;
        this.applyScroll();
    }

    applyScroll() {
        this.container.y = this.scrollY;
        this.connectionGraphics.y = this.scrollY;
    }

    updateScrollBounds() {
        const viewHeight = this.scene.scale.height;
        const contentTop = this.minContentY;
        const contentBottom = this.maxContentY;

        let min = viewHeight - BOTTOM_MARGIN - contentBottom;
        let max = TOP_MARGIN - contentTop;

        if (min > max) {
            const midpoint = (min + max) / 2;
            min = midpoint;
            max = midpoint;
        }

        this.minScrollY = min;
        this.maxScrollY = max;

        if (this.scrollY < this.minScrollY || this.scrollY > this.maxScrollY) {
            this.setScrollY(Phaser.Math.Clamp(this.scrollY, this.minScrollY, this.maxScrollY));
        } else {
            this.applyScroll();
        }
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        this.hide();

        if (this.scene && this.scene.input) {
            this.scene.input.off('wheel', this.handleWheel, this);
            this.scene.input.off('pointerdown', this.handlePointerDown, this);
            this.scene.input.off('pointermove', this.handlePointerMove, this);
            this.scene.input.off('pointerup', this.handlePointerUp, this);
            this.scene.input.off('pointerupoutside', this.handlePointerUp, this);
        }

        if (this.scene && this.scene.events) {
            this.scene.events.off('shutdown', this.destroy, this);
            this.scene.events.off('destroy', this.destroy, this);
        }

        if (this.connectionGraphics) {
            this.connectionGraphics.destroy();
            this.connectionGraphics = null;
        }

        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        this.nodeRefs.clear();
    }
}
