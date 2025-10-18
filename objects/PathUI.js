import { PATH_NODE_TYPES } from '../systems/PathManager.js';
import { CONSTANTS } from '../config.js';

const COLORS = {
    [PATH_NODE_TYPES.ENEMY]: 0xe74c3c,
    [PATH_NODE_TYPES.SHOP]: 0xf1c40f,
    [PATH_NODE_TYPES.INFIRMARY]: 0x27ae60,
    [PATH_NODE_TYPES.TOWER]: 0x5dade2,
    [PATH_NODE_TYPES.UPGRADE]: 0xf39c12,
    boss: 0x9b59b6,
    completed: 0x7f8c8d,
    whiteStroke: 0xffeeee,
    blackStroke: 0x111111
};

const ICONS = {
    [PATH_NODE_TYPES.ENEMY]: '⚔️',
    [PATH_NODE_TYPES.SHOP]: '🛒',
    [PATH_NODE_TYPES.INFIRMARY]: '⊕',
    [PATH_NODE_TYPES.TOWER]: '🎲',
    [PATH_NODE_TYPES.UPGRADE]: '✨',
    boss: '🔥'
};

const LAYOUT = {
    baseY: 140,
    columnSpacing: 220,
    rowSpacing: 156
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
    constructor(scene, pathManager, onSelect, { connectionTextureKey } = {}) {
        this.scene = scene;
        this.pathManager = pathManager;
        this.onSelect = typeof onSelect === 'function' ? onSelect : () => {};
        this.connectionTextureKey = connectionTextureKey || 'path_ladder';

        this.container = scene.add.container(0, 0);
        this.container.setDepth(20);

        this.connectionGraphics = scene.add.graphics();
        this.connectionGraphics.setDepth(19);

        this.connectionSpriteContainer = scene.add.container(0, 0);
        this.connectionSpriteContainer.setDepth(19);
        this.connectionSprites = [];

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
            const color = COLORS[typeKey] || COLORS.whiteStroke;
            const icon = isBoss ? ICONS.boss : ICONS[node.type];

            const cube = this.scene.add.rectangle(0, 0, 56, 56, color, 1)
                .setStrokeStyle(3, COLORS.whiteStroke, 0.9)
                .setInteractive({ useHandCursor: true })
                .setAngle(45);

            // hover handlers: only effective when cube is interactive (setInteractive only for selectable nodes)
            cube.on('pointerover', () => {
            if (!this.isNodeSelectable(node.id)) return;
                cube.setStrokeStyle(4, COLORS.whiteStroke, 1); // change stroke color & width on hover
            });
        
            cube.on('pointerout', () => {
                this.updateState();
            });

            const iconText = this.scene.add.text(0, 0, icon || '?', {
                fontSize: '24px',
                color: '#000000',
                padding: CONSTANTS.EMOJI_TEXT_PADDING
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

        this.clearConnectionSprites();

        const textureKey = this.connectionTextureKey || 'path_ladder';
        const ladderTexture = this.scene.textures && this.scene.textures.get(textureKey);
        const sourceImage = ladderTexture && ladderTexture.getSourceImage ? ladderTexture.getSourceImage() : null;

        if (!sourceImage) {
            // Fallback: draw simple lines if the texture is unavailable.
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
            return;
        }

        const ladderHeight = Math.max(1, sourceImage.height || 1);
        const halfHeight = ladderHeight / 2;
        const processed = new Set();
        const nodes = this.pathManager.getNodes();

        nodes.forEach(node => {
            const fromPos = this.getNodePosition(node);
            (node.connections || []).forEach(connectionId => {
                const target = this.pathManager.getNode(connectionId);
                if (!target) {
                    return;
                }

                const keyParts = [node.id, connectionId];
                if (keyParts.every(part => typeof part !== 'undefined')) {
                    keyParts.sort();
                    const key = keyParts.join('::');
                    if (processed.has(key)) {
                        return;
                    }
                    processed.add(key);
                }

                const toPos = this.getNodePosition(target);
                const dx = toPos.x - fromPos.x;
                const dy = toPos.y - fromPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance === 0) {
                    return;
                }

                const angle = Phaser.Math.Angle.Between(fromPos.x, fromPos.y, toPos.x, toPos.y) - Math.PI / 2;
                const step = ladderHeight;
                const unitX = dx / distance;
                const unitY = dy / distance;

                const addSegmentAtOffset = offset => {
                    const x = fromPos.x + unitX * offset;
                    const y = fromPos.y + unitY * offset;
                    const segment = this.scene.add.image(x, y, textureKey);
                    segment.setOrigin(0.5, 0.5);
                    segment.setDepth(19);
                    segment.setRotation(angle);
                    segment.setPosition(Math.round(segment.x), Math.round(segment.y));

                    this.connectionSpriteContainer.add(segment);
                    this.connectionSprites.push(segment);
                };

                if (distance <= ladderHeight) {
                    addSegmentAtOffset(distance / 2);
                    return;
                }

                const firstOffset = halfHeight;
                const lastOffset = distance - halfHeight;
                let offset = firstOffset;

                while (offset <= lastOffset) {
                    addSegmentAtOffset(offset);
                    offset += step;
                }

                const previousOffset = offset - step;
                if (lastOffset - previousOffset > 1e-3) {
                    addSegmentAtOffset(lastOffset);
                }
            });
        });
    }

    clearConnectionSprites() {
        if (!Array.isArray(this.connectionSprites)) {
            return;
        }

        this.connectionSprites.forEach(sprite => {
            if (sprite && typeof sprite.destroy === 'function') {
                sprite.destroy();
            }
        });
        this.connectionSprites.length = 0;
    }

    isTestingModeActive() {
        return !!(this.scene && this.scene.testingModeEnabled);
    }

    isNodeSelectable(nodeId) {
        if (!nodeId) {
            return false;
        }

        if (this.isTestingModeActive()) {
            return this.nodeRefs.has(nodeId);
        }

        const availableIds = this.pathManager.getAvailableNodeIds();
        return availableIds.includes(nodeId);
    }

    updateState() {
        const availableIds = new Set(this.pathManager.getAvailableNodeIds());
        const testingMode = this.isTestingModeActive();

        this.nodeRefs.forEach(({ node, cube, iconText, labelText, isBoss }) => {
            const typeKey = isBoss ? 'boss' : node.type;
            const baseColor = COLORS[typeKey] || COLORS.whiteStroke;
            const isCompleted = this.pathManager.isNodeCompleted(node.id);
            const isAvailable = availableIds.has(node.id);

            let fillColor = baseColor;
            let strokeWidth = 4;
            let strokeAlpha = 1;
            let strokeColor = COLORS.blackStroke;
            let iconAlpha = 1;
            let labelAlpha = 1;
            let interactive = false;

            if (isCompleted) {
                fillColor = blendColor(baseColor, 0x1f2a30, 0.55);
                strokeWidth = 2;
                iconAlpha = 0.6;
                labelAlpha = 0.65;
                strokeColor = COLORS.whiteStroke;
                if (testingMode) {
                    interactive = true;
                    strokeWidth = 3;
                }
            } else if (isAvailable || testingMode) {
                interactive = true;
                if (testingMode && !isAvailable) {
                    strokeColor = COLORS.whiteStroke;
                }
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
        if (this.connectionSpriteContainer) {
            this.connectionSpriteContainer.setVisible(true);
        }
    }

    hide() {
        this.isActive = false;
        this.isDragging = false;
        this.dragPointerId = null;
        this.container.setVisible(false);
        this.connectionGraphics.setVisible(false);
        if (this.connectionSpriteContainer) {
            this.connectionSpriteContainer.setVisible(false);
        }
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

        const scrollDeltaY = typeof deltaY === 'number' ? deltaY : 0;
        const delta = -scrollDeltaY * WHEEL_SCROLL_MULTIPLIER;
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
        if (this.connectionSpriteContainer) {
            this.connectionSpriteContainer.y = this.scrollY;
        }
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

        this.clearConnectionSprites();

        if (this.connectionSpriteContainer) {
            this.connectionSpriteContainer.destroy(true);
            this.connectionSpriteContainer = null;
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
