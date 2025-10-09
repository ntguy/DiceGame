import { PATH_NODE_TYPES } from '../systems/PathManager.js';

const NODE_SIZE = 60;

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

function lightenColor(color, amount = 20) {
    const base = Phaser.Display.Color.ValueToColor(color);
    base.brighten(amount);
    return base.color;
}

function darkenColor(color, amount = 20) {
    const base = Phaser.Display.Color.ValueToColor(color);
    base.darken(amount);
    return base.color;
}

function createCube(scene, size, color) {
    const container = scene.add.container(0, 0);
    const shadow = scene.add.rectangle(6, 8, size, size, 0x000000, 0.25).setOrigin(0.5);
    const side = scene.add.rectangle(4, 4, size, size, darkenColor(color, 25)).setOrigin(0.5);
    const face = scene.add.rectangle(0, 0, size, size, color).setOrigin(0.5);
    const highlight = scene.add.rectangle(-size * 0.15, -size * 0.15, size * 0.45, size * 0.45, lightenColor(color, 35))
        .setOrigin(0.5)
        .setAngle(-45)
        .setAlpha(0.75);

    container.add([shadow, side, face, highlight]);

    return { container, shadow, side, face, highlight };
}

function applyCubeColors(cube, color) {
    cube.face.setFillStyle(color, 1);
    cube.side.setFillStyle(darkenColor(color, 25), 1);
    cube.highlight.setFillStyle(lightenColor(color, 35), 0.8);
}

function highlightCube(cube, color) {
    cube.face.setFillStyle(lightenColor(color, 15), 1);
    cube.side.setFillStyle(darkenColor(color, 10), 1);
    cube.highlight.setFillStyle(lightenColor(color, 50), 0.9);
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

            const cube = createCube(this.scene, NODE_SIZE, color);
            applyCubeColors(cube, color);

            const iconText = this.scene.add.text(0, -4, icon || '?', {
                fontSize: '24px',
                color: '#000000'
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(0, NODE_SIZE / 2 + 20, node.label || '', {
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);

            container.add([cube.container, iconText, labelText]);
            this.container.add(container);

            const ref = {
                node,
                container,
                cube,
                iconText,
                labelText,
                isBoss,
                currentColor: color
            };

            cube.face.setInteractive({ useHandCursor: true });
            cube.face.on('pointerup', pointer => {
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

            cube.face.on('pointerover', () => {
                if (!cube.face.input || !cube.face.input.enabled) {
                    return;
                }
                highlightCube(ref.cube, ref.currentColor);
            });

            cube.face.on('pointerout', () => {
                applyCubeColors(ref.cube, ref.currentColor);
            });

            cube.face.disableInteractive();

            this.nodeRefs.set(node.id, ref);

            const top = y - NODE_SIZE / 2 - 10;
            const bottom = y + NODE_SIZE / 2 + 40;
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

    isNodeSelectable(nodeId) {
        const availableIds = this.pathManager.getAvailableNodeIds();
        return availableIds.includes(nodeId);
    }

    updateState() {
        const availableIds = new Set(this.pathManager.getAvailableNodeIds());
        const currentId = this.pathManager.getCurrentNodeId();

        this.nodeRefs.forEach(ref => {
            const { node, cube, iconText, labelText, isBoss } = ref;
            const typeKey = isBoss ? 'boss' : node.type;
            const baseColor = COLORS[typeKey] || 0xffffff;
            const isCompleted = this.pathManager.isNodeCompleted(node.id);
            const isLocked = this.pathManager.isNodeLocked(node.id);
            const isCurrent = currentId === node.id;
            const isAvailable = availableIds.has(node.id);

            const displayColor = isCompleted ? COLORS.completed : baseColor;
            applyCubeColors(cube, displayColor);
            ref.currentColor = displayColor;

            let alpha = 1;
            let iconAlpha = 1;
            let labelAlpha = 1;

            if (isCurrent) {
                cube.container.setScale(1.08);
                cube.face.disableInteractive();
            } else if (isCompleted) {
                alpha = 0.35;
                iconAlpha = 0.45;
                labelAlpha = 0.45;
                cube.container.setScale(1);
                cube.face.disableInteractive();
            } else if (isAvailable) {
                cube.container.setScale(1);
                cube.face.setInteractive({ useHandCursor: true });
            } else if (isLocked) {
                alpha = 0.2;
                iconAlpha = 0.25;
                labelAlpha = 0.25;
                cube.container.setScale(1);
                cube.face.disableInteractive();
            } else {
                alpha = 0.4;
                iconAlpha = 0.4;
                labelAlpha = 0.4;
                cube.container.setScale(1);
                cube.face.disableInteractive();
            }

            cube.container.setAlpha(alpha);
            iconText.setAlpha(iconAlpha);
            labelText.setAlpha(labelAlpha);
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

    handleWheel(pointer, gameObjects, deltaX, deltaY) {
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
