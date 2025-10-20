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

const PATH_TEXTURE_SCALE = 1.5;
const GENERAL_TEXTURE_SCALE = 2;
const WALL_HIGHLIGHT_TEXTURE_KEY = 'wall_highlight_center';
const WALL_HIGHLIGHT_MIN_ALPHA = 0.8;
const WALL_HIGHLIGHT_MAX_ALPHA = 1;
const WALL_HIGHLIGHT_TWEEN_DURATION = 120;
const WALL_TORCH_TEXTURE_KEY = 'wall_torch';
const WALL_TORCH_ANIMATION_KEY = 'wall_torch_flicker';
const WALL_TORCH_FRAME_RATE = 8;
const PATH_DEPTHS = {
    outsideBackground: -5,
    background: 5,
    walls: -1, // grr healthbar
    connections: 7,
    nodes: 8
};

const DRAG_THRESHOLD = 6;
const TOP_MARGIN = 80;
const BOTTOM_MARGIN = 80;
const WHEEL_SCROLL_MULTIPLIER = 0.5;
const SCROLL_INPUT_MULTIPLIER = 0.5;
const OUTSIDE_BACKGROUND_SCROLL_MULTIPLIER = 0.25;
const FARTHEST_OUTSIDE_LAYER_MULTIPLIER = 0.6;
const OUTSIDE_BACKGROUND_LAYER_HORIZONTAL_OFFSETS = {
    outside_background_2: -350
};
const SPARKLE_TEXTURE_KEY = 'outside_star_sparkle';
const BUG_TEXTURE_KEY = 'outside_bug_sprite';

function ensureSparkleTexture(scene) {
    if (!scene || !scene.textures || typeof scene.textures.exists !== 'function') {
        return null;
    }

    if (scene.textures.exists(SPARKLE_TEXTURE_KEY)) {
        return SPARKLE_TEXTURE_KEY;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    const size = 12;
    const half = size / 2;
    const accent = size * 0.3;

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(half, half, half * 0.45);
    graphics.fillRect(half - accent / 2, half - half * 0.9, accent, size);
    graphics.fillRect(half - half * 0.9, half - accent / 2, size, accent);
    graphics.generateTexture(SPARKLE_TEXTURE_KEY, size, size);
    graphics.destroy();

    return SPARKLE_TEXTURE_KEY;
}

function ensureBugTexture(scene) {
    if (!scene || !scene.textures || typeof scene.textures.exists !== 'function') {
        return null;
    }

    if (scene.textures.exists(BUG_TEXTURE_KEY)) {
        return BUG_TEXTURE_KEY;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    const size = 10;
    const half = size / 2;
    const wingWidth = size * 0.4;
    const wingHeight = size * 0.25;

    graphics.fillStyle(0x111111, 1);
    graphics.fillEllipse(half, half, size * 0.5, size * 0.65);
    graphics.fillEllipse(half - wingWidth * 0.4, half, wingWidth, wingHeight);
    graphics.fillEllipse(half + wingWidth * 0.4, half, wingWidth, wingHeight);
    graphics.generateTexture(BUG_TEXTURE_KEY, size, size);
    graphics.destroy();

    return BUG_TEXTURE_KEY;
}

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
    constructor(scene, pathManager, onSelect, { connectionTextureKey, wallTextureKey, backgroundTextureKey, outsideBackgroundLayerKeys, outsideBackgroundConfig } = {}) {
        this.scene = scene;
        this.pathManager = pathManager;
        this.onSelect = typeof onSelect === 'function' ? onSelect : () => {};
        this.connectionTextureKey = connectionTextureKey || 'path_ladder';
        this.wallTextureKey = wallTextureKey || null;
        this.backgroundTextureKey = backgroundTextureKey || 'path_background';
        this.outsideBackgroundLayerKeys = Array.isArray(outsideBackgroundLayerKeys)
            ? outsideBackgroundLayerKeys.filter(key => typeof key === 'string' && key.length > 0)
            : [];
        this.outsideBackgroundConfig = outsideBackgroundConfig && typeof outsideBackgroundConfig === 'object'
            ? outsideBackgroundConfig
            : null;

        this.outsideBackgroundContainer = scene.add.container(0, 0);
        this.outsideBackgroundContainer.setDepth(PATH_DEPTHS.outsideBackground);
        this.outsideBackgroundLayers = [];
        this.backgroundContainer = scene.add.container(0, 0);
        this.backgroundContainer.setDepth(PATH_DEPTHS.background);
        this.backgroundSprite = null;
        this.wallContainer = scene.add.container(0, 0);
        this.wallContainer.setDepth(PATH_DEPTHS.walls);
        this.wallSprites = [];
        this.wallHighlightSprites = [];
        this.wallHighlightTweens = [];
        this.wallTorchSprites = [];

        this.container = scene.add.container(0, 0);
        this.container.setDepth(PATH_DEPTHS.nodes);

        this.connectionGraphics = scene.add.graphics();
        this.connectionGraphics.setDepth(PATH_DEPTHS.connections);

        this.connectionSpriteContainer = scene.add.container(0, 0);
        this.connectionSpriteContainer.setDepth(PATH_DEPTHS.connections);
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
        this.createWalls();
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

    getWallTexture() {
        if (!this.wallTextureKey) {
            return null;
        }

        const textures = this.scene && this.scene.textures;
        if (!textures || typeof textures.exists !== 'function' || !textures.exists(this.wallTextureKey)) {
            return null;
        }

        return textures.get(this.wallTextureKey);
    }

    getBackgroundTexture() {
        if (!this.backgroundTextureKey) {
            return null;
        }

        const textures = this.scene && this.scene.textures;
        if (!textures || typeof textures.exists !== 'function' || !textures.exists(this.backgroundTextureKey)) {
            return null;
        }

        return textures.get(this.backgroundTextureKey);
    }

    clearWallSprites() {
        this.clearWallTorchSprites();
        this.clearWallHighlightSprites();

        if (Array.isArray(this.wallSprites)) {
            this.wallSprites.forEach(sprite => {
                if (sprite && typeof sprite.destroy === 'function') {
                    sprite.destroy();
                }
            });

            this.wallSprites.length = 0;
        } else {
            this.wallSprites = [];
        }

        if (this.wallContainer && typeof this.wallContainer.removeAll === 'function') {
            this.wallContainer.removeAll(false);
        }
    }

    clearWallHighlightSprites() {
        if (Array.isArray(this.wallHighlightTweens)) {
            this.wallHighlightTweens.forEach(tween => {
                if (!tween) {
                    return;
                }

                if (typeof tween.stop === 'function') {
                    tween.stop();
                }

                if (typeof tween.remove === 'function') {
                    tween.remove();
                }
            });

            this.wallHighlightTweens.length = 0;
        } else {
            this.wallHighlightTweens = [];
        }

        if (Array.isArray(this.wallHighlightSprites)) {
            this.wallHighlightSprites.forEach(sprite => {
                if (sprite && typeof sprite.destroy === 'function') {
                    sprite.destroy();
                }
            });

            this.wallHighlightSprites.length = 0;
        } else {
            this.wallHighlightSprites = [];
        }
    }

    clearWallTorchSprites() {
        if (Array.isArray(this.wallTorchSprites)) {
            this.wallTorchSprites.forEach(sprite => {
                if (!sprite) {
                    return;
                }

                if (sprite.anims && typeof sprite.anims.stop === 'function') {
                    sprite.anims.stop();
                }

                if (typeof sprite.destroy === 'function') {
                    sprite.destroy();
                }
            });

            this.wallTorchSprites.length = 0;
        } else {
            this.wallTorchSprites = [];
        }
    }

    clearBackgroundSprite() {
        if (this.backgroundSprite && typeof this.backgroundSprite.destroy === 'function') {
            this.backgroundSprite.destroy();
        }

        this.backgroundSprite = null;

        if (this.backgroundContainer && typeof this.backgroundContainer.removeAll === 'function') {
            this.backgroundContainer.removeAll(false);
        }
    }

    clearOutsideBackgroundSprites() {
        if (Array.isArray(this.outsideBackgroundLayers)) {
            this.outsideBackgroundLayers.forEach(layer => {
                const sprite = layer && layer.sprite ? layer.sprite : null;
                const tweens = [];
                if (layer) {
                    if (layer.tween) {
                        tweens.push(layer.tween);
                    }
                    if (Array.isArray(layer.tweens)) {
                        tweens.push(...layer.tweens);
                    }
                }

                tweens.forEach(entry => {
                    if (entry && typeof entry.remove === 'function') {
                        entry.remove();
                    }
                });

                if (sprite && typeof sprite.destroy === 'function') {
                    sprite.destroy();
                }
            });
        }

        this.outsideBackgroundLayers = [];

        if (this.outsideBackgroundContainer && typeof this.outsideBackgroundContainer.removeAll === 'function') {
            this.outsideBackgroundContainer.removeAll(false);
        }
    }

    createWalls() {
        if (!this.wallContainer) {
            return;
        }

        this.clearWallSprites();
        this.clearBackgroundSprite();
        this.clearOutsideBackgroundSprites();

        const texture = this.getWallTexture();
        if (!texture || typeof texture.getSourceImage !== 'function') {
            return;
        }

        const sourceImage = texture.getSourceImage();
        if (!sourceImage) {
            return;
        }

        const nodes = this.pathManager.getNodes();
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return;
        }

        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        nodes.forEach(node => {
            const { x } = this.getNodePosition(node);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
            return;
        }

        const wallSourceWidth = Math.max(1, sourceImage.width || 1);
        const wallWidth = wallSourceWidth * GENERAL_TEXTURE_SCALE;
        const wallSourceHeight = Math.max(1, sourceImage.height || 1);
        const wallPieceHeight = wallSourceHeight * GENERAL_TEXTURE_SCALE;
        const wallHalfWidth = wallWidth / 2;
        const nodeHalfWidth = 28;
        const lateralPadding = 30;
        const offset = nodeHalfWidth + wallHalfWidth + lateralPadding;
        const leftX = minX - offset;
        const rightX = maxX + offset;

        const minContentY = Number.isFinite(this.minContentY) ? this.minContentY : 0;
        const maxContentY = Number.isFinite(this.maxContentY) ? this.maxContentY : 0;
        const top = minContentY - TOP_MARGIN;
        const bottom = maxContentY + BOTTOM_MARGIN;
        const height = Math.max(1, bottom - top);
        const centerY = (top + bottom) / 2;

        this.createOutsideBackgroundSprites({ top, bottom, height, centerY });

        const backgroundTexture = this.getBackgroundTexture();
        if (backgroundTexture && this.backgroundContainer) {
            const backgroundWidth = Math.max(1, rightX - leftX - wallWidth);
            if (backgroundWidth > 0) {
                const backgroundSprite = this.scene.add.tileSprite(
                    (leftX + rightX) / 2,
                    centerY,
                    backgroundWidth,
                    height,
                    this.backgroundTextureKey
                );
                backgroundSprite.setTileScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE); // apply uniform scaling
                backgroundSprite.setOrigin(0.5, 0.5);
                backgroundSprite.setDepth(PATH_DEPTHS.background);
                backgroundSprite.setPosition(Math.round(backgroundSprite.x), Math.round(backgroundSprite.y));
                this.backgroundContainer.add(backgroundSprite);
                this.backgroundSprite = backgroundSprite;
            }
        }

        const textures = this.scene && this.scene.textures;
        const hasHighlightTexture = textures
            && typeof textures.exists === 'function'
            && textures.exists(WALL_HIGHLIGHT_TEXTURE_KEY);
        const hasTorchTexture = textures
            && typeof textures.exists === 'function'
            && textures.exists(WALL_TORCH_TEXTURE_KEY);
        const torchAnimationReady = hasTorchTexture && this.ensureWallTorchAnimation();

        [leftX, rightX].forEach(x => {
            const sprite = this.scene.add.tileSprite(x, centerY, wallWidth, height, this.wallTextureKey);
            sprite.setOrigin(0.5, 0.5);
            sprite.setDepth(PATH_DEPTHS.walls);
            sprite.setTileScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE);
            sprite.setPosition(Math.round(sprite.x), Math.round(sprite.y));
            this.wallContainer.add(sprite);
            this.wallSprites.push(sprite);

            if ((!hasHighlightTexture && !torchAnimationReady)
                || !Number.isFinite(wallPieceHeight)
                || wallPieceHeight <= 0) {
                return;
            }

            const pieceCount = Math.max(0, Math.ceil(height / wallPieceHeight));
            for (let index = 2; index < pieceCount; index += 3) {
                const y = top + (index + 0.5) * wallPieceHeight;
                if (y < top || y > bottom) {
                    continue;
                }

                if (hasHighlightTexture) {
                    const highlightSprite = this.scene.add.sprite(x, y, WALL_HIGHLIGHT_TEXTURE_KEY);
                    highlightSprite.setOrigin(0.5, 0.5);
                    highlightSprite.setScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE);
                    highlightSprite.setDepth(PATH_DEPTHS.walls + 0.01);
                    highlightSprite.setAlpha(WALL_HIGHLIGHT_MAX_ALPHA);
                    highlightSprite.setPosition(Math.round(highlightSprite.x), Math.round(highlightSprite.y));
                    this.wallContainer.add(highlightSprite);
                    this.wallHighlightSprites.push(highlightSprite);

                    if (this.scene && this.scene.tweens && typeof this.scene.tweens.add === 'function') {
                        const tween = this.scene.tweens.add({
                            targets: highlightSprite,
                            alpha: {
                                from: WALL_HIGHLIGHT_MIN_ALPHA + (Math.random() * 0.2),
                                to: WALL_HIGHLIGHT_MAX_ALPHA
                            },
                            duration: WALL_HIGHLIGHT_TWEEN_DURATION,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });

                        this.wallHighlightTweens.push(tween);
                    }
                }

                if (torchAnimationReady) {
                    const torchSprite = this.scene.add.sprite(x, y, WALL_TORCH_TEXTURE_KEY, 0);
                    torchSprite.setOrigin(0.5, 0.5);
                    torchSprite.setScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE);
                    torchSprite.setDepth(PATH_DEPTHS.walls + 0.02);
                    torchSprite.setPosition(Math.round(torchSprite.x), Math.round(torchSprite.y));
                    this.wallContainer.add(torchSprite);
                    this.wallTorchSprites.push(torchSprite);

                    if (typeof torchSprite.play === 'function') {
                        torchSprite.play(WALL_TORCH_ANIMATION_KEY);
                        const randomProgress = typeof Phaser !== 'undefined'
                            && Phaser.Math
                            && typeof Phaser.Math.FloatBetween === 'function'
                                ? Phaser.Math.FloatBetween(0, 1)
                                : Math.random();
                        if (torchSprite.anims && typeof torchSprite.anims.setProgress === 'function') {
                            torchSprite.anims.setProgress(randomProgress);
                        }
                    }
                }
            }
        });
    }

    ensureWallTorchAnimation() {
        if (!this.scene || !this.scene.anims) {
            return false;
        }

        const anims = this.scene.anims;
        const animationAlreadyExists = (typeof anims.exists === 'function' && anims.exists(WALL_TORCH_ANIMATION_KEY))
            || (typeof anims.get === 'function' && anims.get(WALL_TORCH_ANIMATION_KEY));
        if (animationAlreadyExists) {
            return true;
        }

        const textures = this.scene.textures;
        if (!textures || typeof textures.exists !== 'function' || !textures.exists(WALL_TORCH_TEXTURE_KEY)) {
            return false;
        }

        const texture = textures.get(WALL_TORCH_TEXTURE_KEY);
        if (!texture) {
            return false;
        }

        const frameNames = typeof texture.getFrameNames === 'function'
            ? texture.getFrameNames(false)
            : Object.keys(texture.frames || {}).filter(name => name !== '__BASE');

        if (!Array.isArray(frameNames) || frameNames.length === 0) {
            return false;
        }

        if (typeof anims.create !== 'function') {
            return false;
        }

        const sortedFrameNames = [...frameNames].sort((a, b) => {
            const aNum = Number(a);
            const bNum = Number(b);
            if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
                return String(a).localeCompare(String(b));
            }
            return aNum - bNum;
        });

        const frames = sortedFrameNames.map(frame => ({ key: WALL_TORCH_TEXTURE_KEY, frame }));

        anims.create({
            key: WALL_TORCH_ANIMATION_KEY,
            frames,
            frameRate: WALL_TORCH_FRAME_RATE,
            repeat: -1
        });

        return true;
    }

    createOutsideBackgroundSprites({ top, bottom, height, centerY }) {
        if (!this.outsideBackgroundContainer) {
            return;
        }

        this.clearOutsideBackgroundSprites();

        if (!Array.isArray(this.outsideBackgroundLayerKeys) || this.outsideBackgroundLayerKeys.length === 0) {
            return;
        }

        const config = this.outsideBackgroundConfig;
        if (config && Array.isArray(config.layers) && config.layers.length > 0) {
            this.createConfiguredOutsideBackgroundLayers({ top, bottom, height, centerY, config });
            return;
        }

        this.createDefaultOutsideBackgroundLayers({ top, bottom, height, centerY });
    }

    createDefaultOutsideBackgroundLayers({ top, height, centerY }) {
        if (!Array.isArray(this.outsideBackgroundLayerKeys) || this.outsideBackgroundLayerKeys.length === 0) {
            return;
        }

        const textures = this.scene && this.scene.textures;
        const count = this.outsideBackgroundLayerKeys.length;
        const minFactor = 0.15;
        const maxFactor = 1;
        const defaultScale = 2;
        const baseX = this.scene && this.scene.scale ? this.scene.scale.width / 2 : 0;
        const defaultY = this.scene && this.scene.scale ? this.scene.scale.height / 2 : 0;
        const sceneHeight = this.scene && this.scene.scale ? this.scene.scale.height : 0;
        const spanHeight = Number.isFinite(height) ? height : sceneHeight;
        const spanTop = Number.isFinite(top)
            ? top
            : (Number.isFinite(centerY) ? centerY - spanHeight / 2 : defaultY - spanHeight / 2);
        const coverageHeight = Math.max(spanHeight, sceneHeight) + sceneHeight;
        const viewportHeight = Number.isFinite(sceneHeight) && sceneHeight > 0 ? sceneHeight : spanHeight;

        const clamp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Clamp === 'function'
            ? Phaser.Math.Clamp
            : (value, min, max) => Math.min(Math.max(value, min), max);
        const lerp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Linear === 'function'
            ? Phaser.Math.Linear
            : (start, end, t) => start + (end - start) * t;

        this.outsideBackgroundLayerKeys.forEach((key, index) => {
            if (!key || !textures || typeof textures.exists !== 'function' || !textures.exists(key)) {
                return;
            }

            const t = count > 1 ? clamp(index / (count - 1), 0, 1) : 1;
            const baseScrollFactor = count > 1 ? lerp(minFactor, maxFactor, t) : maxFactor;
            const slowdownMultiplier = index === 0
                ? OUTSIDE_BACKGROUND_SCROLL_MULTIPLIER * FARTHEST_OUTSIDE_LAYER_MULTIPLIER
                : OUTSIDE_BACKGROUND_SCROLL_MULTIPLIER;
            const scrollFactor = baseScrollFactor * slowdownMultiplier;
            const texture = textures.get(key);
            const source = texture && typeof texture.getSourceImage === 'function' ? texture.getSourceImage() : null;
            const sourceWidth = source && source.width ? source.width : sceneHeight || 1;
            const sourceHeight = source && source.height ? source.height : sceneHeight || 1;
            const horizontalOffset = OUTSIDE_BACKGROUND_LAYER_HORIZONTAL_OFFSETS[key] || 0;

            if (index === 0) {
                const width = sourceWidth * defaultScale;
                const tileHeight = Math.max(coverageHeight, sourceHeight * defaultScale);
                const tileY = spanTop + tileHeight / 2;
                let tileFrameKey = null;

                if (texture && typeof texture.has === 'function' && typeof texture.add === 'function') {
                    const croppedHeight = Math.max(1, Math.floor(sourceHeight * 0.45));
                    const frameKey = `${key}_topHalf`;
                    if (!texture.has(frameKey)) {
                        texture.add(frameKey, 0, 0, 0, sourceWidth, croppedHeight);
                    }
                    if (texture.has(frameKey)) {
                        tileFrameKey = frameKey;
                    }
                }

                const tileSprite = this.scene.add.tileSprite(
                    baseX + horizontalOffset,
                    tileY,
                    width,
                    tileHeight,
                    key,
                    tileFrameKey || undefined
                );
                tileSprite.setOrigin(0.5, 0.5);
                tileSprite.setTileScale(defaultScale, defaultScale);
                tileSprite.setScrollFactor(0);
                const layerDepth = PATH_DEPTHS.outsideBackground + index * 0.01;
                tileSprite.setDepth(layerDepth);
                tileSprite.setPosition(Math.round(tileSprite.x), Math.round(tileSprite.y));

                this.outsideBackgroundContainer.add(tileSprite);

                this.outsideBackgroundLayers.push({
                    sprite: tileSprite,
                    baseY: tileSprite.y,
                    baseX: tileSprite.x,
                    baseTileX: tileSprite.tilePositionX || 0,
                    baseTileY: tileSprite.tilePositionY || 0,
                    scrollFactor,
                    isTileSprite: true
                });

                this.createOutsideSparkles({
                    baseX,
                    coverageHeight,
                    tileWidth: width,
                    scrollFactor,
                    layerDepth
                });
                return;
            }

            const spriteHeight = sourceHeight * defaultScale;
            const progress = count > 1 ? clamp(index / (count - 1), 0, 1) : 1;
            const minOffset = viewportHeight * 0.12;
            const maxOffset = viewportHeight * 0.45;
            const verticalOffset = lerp(minOffset, maxOffset, progress);
            const spriteY = spanTop + spriteHeight / 2 + verticalOffset - 100;
            const sprite = this.scene.add.image(baseX + horizontalOffset, spriteY, key);
            sprite.setOrigin(0.5, 0.5);
            sprite.setScale(defaultScale);
            sprite.setScrollFactor(0);
            sprite.setDepth(PATH_DEPTHS.outsideBackground + index * 0.01);
            sprite.setPosition(Math.round(sprite.x), Math.round(sprite.y));

            this.outsideBackgroundContainer.add(sprite);

            this.outsideBackgroundLayers.push({
                sprite,
                baseY: sprite.y,
                baseX: sprite.x,
                scrollFactor
            });
        });
    }

    createConfiguredOutsideBackgroundLayers({ top, height, centerY, config }) {
        const textures = this.scene && this.scene.textures;
        if (!textures || typeof textures.exists !== 'function') {
            return;
        }

        const sceneWidth = this.scene && this.scene.scale ? this.scene.scale.width : 0;
        const sceneHeight = this.scene && this.scene.scale ? this.scene.scale.height : 0;
        const spanHeight = Number.isFinite(height) ? height : sceneHeight;
        const defaultY = Number.isFinite(centerY) ? centerY : sceneHeight / 2;
        const spanTop = Number.isFinite(config && config.baseTop)
            ? config.baseTop
            : (Number.isFinite(top) ? top : defaultY - spanHeight / 2);
        const baseX = sceneWidth / 2;
        const layers = Array.isArray(config.layers) ? config.layers : [];
        const depthBase = Number.isFinite(config.depthOffset)
            ? config.depthOffset
            : PATH_DEPTHS.outsideBackground;
        const defaultScale = Number.isFinite(config.defaultScale) ? config.defaultScale : 3;

        layers.forEach((layerConfig, index) => {
            const keyFromConfig = layerConfig && typeof layerConfig.key === 'string'
                ? layerConfig.key
                : null;
            const keyFromFallback = index < this.outsideBackgroundLayerKeys.length
                ? this.outsideBackgroundLayerKeys[index]
                : null;
            const key = keyFromConfig || keyFromFallback;
            if (!key || !textures.exists(key)) {
                return;
            }

            const texture = textures.get(key);
            const source = texture && typeof texture.getSourceImage === 'function' ? texture.getSourceImage() : null;
            const sourceWidth = source && source.width ? source.width : 1;
            const sourceHeight = source && source.height ? source.height : 1;

            const cropTop = Math.max(0, layerConfig && layerConfig.crop && Number.isFinite(layerConfig.crop.top)
                ? layerConfig.crop.top
                : (config && config.crop && Number.isFinite(config.crop.top) ? config.crop.top : 0));
            const cropBottom = Math.max(0, layerConfig && layerConfig.crop && Number.isFinite(layerConfig.crop.bottom)
                ? layerConfig.crop.bottom
                : (config && config.crop && Number.isFinite(config.crop.bottom) ? config.crop.bottom : 0));
            const cropHeight = Math.max(1, sourceHeight - cropTop - cropBottom);

            const sprite = this.scene.add.image(baseX, 0, key);
            sprite.setCrop(0, cropTop, sourceWidth, cropHeight);

            const scale = Number.isFinite(layerConfig && layerConfig.scale)
                ? layerConfig.scale
                : defaultScale;
            sprite.setScale(scale);

            const anchorTop = layerConfig && layerConfig.anchor === 'top';
            sprite.setOrigin(0.5, anchorTop ? 0 : 0.5);

            const offsetX = Number.isFinite(layerConfig && layerConfig.offsetX) ? layerConfig.offsetX : 0;
            const offsetY = Number.isFinite(layerConfig && layerConfig.offsetY) ? layerConfig.offsetY : 0;
            sprite.x = Math.round(baseX + offsetX);

            const displayHeight = cropHeight * scale;
            const baseY = anchorTop
                ? spanTop + offsetY
                : spanTop + displayHeight / 2 + offsetY;
            sprite.y = Math.round(baseY);
            sprite.setScrollFactor(0);
            const depth = depthBase + index * 0.01;
            sprite.setDepth(depth);

            this.outsideBackgroundContainer.add(sprite);

            const scrollFactor = Number.isFinite(layerConfig && layerConfig.scrollFactor)
                ? layerConfig.scrollFactor
                : (Number.isFinite(config.defaultScrollFactor) ? config.defaultScrollFactor : 0.12 * (index + 1));

            this.outsideBackgroundLayers.push({
                sprite,
                baseY: sprite.y,
                baseX: sprite.x,
                scrollFactor,
                anchorTop
            });
        });

        if (config && config.ambient && config.ambient.type === 'bugs') {
            const ambient = config.ambient;
            const ambientWidth = Number.isFinite(ambient.width) ? ambient.width : sceneWidth * 1.1;
            const ambientHeight = Number.isFinite(ambient.height) ? ambient.height : spanHeight * 0.5;
            const ambientTop = Number.isFinite(ambient.top) ? ambient.top : spanTop;
            const ambientDepth = depthBase + layers.length * 0.01 + 0.002;
            this.createOutsideAmbientBugs({
                baseX,
                width: ambientWidth,
                top: ambientTop,
                height: ambientHeight,
                depth: ambientDepth,
                scrollFactor: Number.isFinite(ambient.scrollFactor) ? ambient.scrollFactor : 0.12,
                count: Number.isFinite(ambient.count) ? ambient.count : 50
            });
        }
    }

    createOutsideSparkles({ baseX, coverageHeight, tileWidth, scrollFactor, layerDepth }) {
        const scene = this.scene;
        if (!scene || !this.outsideBackgroundContainer) {
            return;
        }

        const textureKey = ensureSparkleTexture(scene);
        if (!textureKey) {
            return;
        }

        const clamp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Clamp === 'function'
            ? Phaser.Math.Clamp
            : (value, min, max) => Math.min(Math.max(value, min), max);
        const random = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.FloatBetween === 'function'
            ? Phaser.Math.FloatBetween
            : (min, max) => min + Math.random() * (max - min);
        const between = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Between === 'function'
            ? Phaser.Math.Between
            : (min, max) => Math.floor(min + Math.random() * (max - min + 1));

        const safeCoverage = Number.isFinite(coverageHeight) && coverageHeight > 0
            ? coverageHeight
            : ((scene.scale && scene.scale.height) || 0);
        const width = Number.isFinite(tileWidth) && tileWidth > 0
            ? tileWidth
            : (scene.scale && scene.scale.width) || 0;
        const halfWidth = width / 2;
        const minY = CONSTANTS.HEADER_HEIGHT;
        const maxY = safeCoverage * 0.3;
        const sparkleCount = 50;

        for (let i = 0; i < sparkleCount; i += 1) {
            const offsetX = random(-halfWidth, halfWidth);
            const y = clamp(random(minY, maxY), minY, maxY);
            const sparkle = scene.add.image(baseX + offsetX, y, textureKey);
            const baseScale = random(0.2, 0.5);
            sparkle.setScale(baseScale);
            sparkle.setScrollFactor(0);
            sparkle.setDepth(layerDepth + 0.001);
            sparkle.setAlpha(random(0.2, 0.8));
            if (scene.sys && scene.sys.game && Phaser.BlendModes) {
                sparkle.setBlendMode(Phaser.BlendModes.ADD);
            }

            this.outsideBackgroundContainer.add(sparkle);

            const tween = scene.tweens.add({
                targets: sparkle,
                alpha: { from: random(0.1, 0.4), to: 1 },
                scale: { from: baseScale * 0.75, to: baseScale * 1.1 },
                duration: between(900, 1600),
                yoyo: true,
                repeat: -1,
                delay: between(0, 1200),
                ease: 'Sine.easeInOut'
            });

            sparkle.once('destroy', () => {
                if (tween && typeof tween.remove === 'function') {
                    tween.remove();
                }
            });

            this.outsideBackgroundLayers.push({
                sprite: sparkle,
                baseY: sparkle.y,
                baseX: sparkle.x,
                scrollFactor: 0.05,
                tweens: [tween]
            });
        }
    }

    createOutsideAmbientBugs({ baseX, width, top, height, depth, scrollFactor, count }) {
        const scene = this.scene;
        if (!scene || !this.outsideBackgroundContainer) {
            return;
        }

        const textureKey = ensureBugTexture(scene);
        if (!textureKey) {
            return;
        }

        const randomFloat = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.FloatBetween === 'function'
            ? Phaser.Math.FloatBetween
            : (min, max) => min + Math.random() * (max - min);
        const randomInt = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Between === 'function'
            ? Phaser.Math.Between
            : (min, max) => Math.floor(min + Math.random() * (max - min + 1));

        const halfWidth = Number.isFinite(width) && width > 0 ? width / 2 : ((scene.scale && scene.scale.width) || 0) / 2;
        const areaTop = Number.isFinite(top) ? top : CONSTANTS.HEADER_HEIGHT;
        const areaHeight = Number.isFinite(height) && height > 0
            ? height
            : ((scene.scale && scene.scale.height) || 0) * 0.4;
        const areaBottom = areaTop + areaHeight;
        const bugCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 40;
        const depthValue = Number.isFinite(depth) ? depth : PATH_DEPTHS.outsideBackground + 0.005;
        const parallax = Number.isFinite(scrollFactor) ? scrollFactor : 0.1;

        for (let i = 0; i < bugCount; i += 1) {
            const offsetX = randomFloat(-halfWidth, halfWidth);
            const y = randomFloat(areaTop, areaBottom);
            const bug = scene.add.image(baseX + offsetX, y, textureKey);
            const baseScale = randomFloat(0.22, 0.32);
            bug.setScale(baseScale);
            bug.setScrollFactor(0);
            bug.setDepth(depthValue);
            bug.setAlpha(randomFloat(0.45, 0.75));

            this.outsideBackgroundContainer.add(bug);

            const layerEntry = {
                sprite: bug,
                baseX: bug.x,
                baseY: bug.y,
                scrollFactor: parallax,
                dynamicOffsetX: 0,
                dynamicOffsetY: 0
            };

            const flickerTween = scene.tweens.add({
                targets: bug,
                alpha: { from: randomFloat(0.3, 0.5), to: randomFloat(0.6, 0.8) },
                scale: { from: baseScale * 0.9, to: baseScale * 1.05 },
                duration: randomInt(900, 1500),
                yoyo: true,
                repeat: -1,
                delay: randomInt(0, 900),
                ease: 'Sine.easeInOut'
            });

            const drift = { x: 0, y: 0 };
            const driftTween = scene.tweens.add({
                targets: drift,
                x: randomFloat(-28, 28),
                y: randomFloat(-20, 20),
                duration: randomInt(1400, 2200),
                yoyo: true,
                repeat: -1,
                delay: randomInt(0, 1200),
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    layerEntry.dynamicOffsetX = drift.x;
                    layerEntry.dynamicOffsetY = drift.y;
                    const factor = Number.isFinite(layerEntry.scrollFactor) ? layerEntry.scrollFactor : 0;
                    const newY = layerEntry.baseY + this.scrollY * factor + layerEntry.dynamicOffsetY;
                    bug.y = Math.round(newY);
                    bug.x = Math.round(layerEntry.baseX + layerEntry.dynamicOffsetX);
                }
            });

            bug.once('destroy', () => {
                if (flickerTween && typeof flickerTween.remove === 'function') {
                    flickerTween.remove();
                }
                if (driftTween && typeof driftTween.remove === 'function') {
                    driftTween.remove();
                }
            });

            layerEntry.tweens = [flickerTween, driftTween];
            this.outsideBackgroundLayers.push(layerEntry);
        }
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
        const scaledLadderHeight = ladderHeight * PATH_TEXTURE_SCALE;
        const halfHeight = scaledLadderHeight / 2;
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
                const step = scaledLadderHeight;
                const unitX = dx / distance;
                const unitY = dy / distance;

                const fromRow = Number.isFinite(node?.row) ? node.row : 0;
                const toRow = Number.isFinite(target?.row) ? target.row : 0;
                let downwardNodeId = null;

                if (toRow > fromRow && target?.id) {
                    downwardNodeId = target.id;
                } else if (fromRow > toRow && node?.id) {
                    downwardNodeId = node.id;
                }

                const addSegmentAtOffset = offset => {
                    const x = fromPos.x + unitX * offset;
                    const y = fromPos.y + unitY * offset;
                    const segment = this.scene.add.image(x, y, textureKey);
                    segment.setOrigin(0.5, 0.5);
                    segment.setDepth(PATH_DEPTHS.connections);
                    segment.setRotation(angle);
                    segment.setScale(PATH_TEXTURE_SCALE);
                    segment.setPosition(Math.round(segment.x), Math.round(segment.y));

                    this.connectionSpriteContainer.add(segment);
                    this.connectionSprites.push({
                        sprite: segment,
                        nodeAId: node?.id || null,
                        nodeBId: target?.id || null,
                        downwardNodeId
                    });
                };

                if (distance <= step) {
                    addSegmentAtOffset(distance / 2);
                    return;
                }

                const segmentCount = Math.max(1, Math.floor(distance / step));
                const remainder = distance - segmentCount * step;
                let offset = halfHeight + remainder / 2;

                for (let i = 0; i < segmentCount; i++) {
                    if (offset > distance - halfHeight) {
                        offset = distance - halfHeight;
                    }
                    addSegmentAtOffset(offset);
                    offset += step;
                }
            });
        });

        const availableIds = new Set(this.pathManager.getAvailableNodeIds());
        const testingMode = this.isTestingModeActive();
        this.updateConnectionSpriteAlphas(availableIds, testingMode);
    }

    clearConnectionSprites() {
        if (!Array.isArray(this.connectionSprites)) {
            return;
        }

        this.connectionSprites.forEach(entry => {
            const sprite = entry && entry.sprite ? entry.sprite : entry;
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

        this.updateConnectionSpriteAlphas(availableIds, testingMode);
    }

    updateConnectionSpriteAlphas(availableIds, testingMode) {
        if (!Array.isArray(this.connectionSprites) || this.connectionSprites.length === 0) {
            return;
        }

        const availableSet = availableIds instanceof Set
            ? availableIds
            : new Set(Array.isArray(availableIds) ? availableIds : []);
        const isTesting = typeof testingMode === 'boolean'
            ? testingMode
            : this.isTestingModeActive();
        const currentNodeId = typeof this.pathManager?.getCurrentNodeId === 'function'
            ? this.pathManager.getCurrentNodeId()
            : null;
        const isNodeCompletedFn = typeof this.pathManager?.isNodeCompleted === 'function'
            ? nodeId => this.pathManager.isNodeCompleted(nodeId)
            : () => false;

        this.connectionSprites.forEach(entry => {
            if (!entry || !entry.sprite || typeof entry.sprite.setAlpha !== 'function') {
                return;
            }

            const { sprite, downwardNodeId } = entry;

            if (!downwardNodeId) {
                sprite.setAlpha(1);
                return;
            }

            const isSelectable = isTesting
                ? this.nodeRefs.has(downwardNodeId)
                : availableSet.has(downwardNodeId);
            const isCompleted = isNodeCompletedFn(downwardNodeId);
            const isCurrent = currentNodeId === downwardNodeId;

            if (isSelectable || isCompleted || isCurrent) {
                sprite.setAlpha(0.9);
            } else {
                sprite.setAlpha(0.3);
            }
        });
    }

    show() {
        this.isActive = true;
        this.updateScrollBounds();
        this.applyScroll();
        if (this.backgroundContainer) {
            this.backgroundContainer.setVisible(true);
        }
        if (this.wallContainer) {
            this.wallContainer.setVisible(true);
        }
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
        if (this.backgroundContainer) {
            this.backgroundContainer.setVisible(false);
        }
        if (this.wallContainer) {
            this.wallContainer.setVisible(false);
        }
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
        const delta = -scrollDeltaY * WHEEL_SCROLL_MULTIPLIER * SCROLL_INPUT_MULTIPLIER;
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
        this.setScrollY(this.scrollStartY + deltaY * SCROLL_INPUT_MULTIPLIER);
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
        if (this.backgroundContainer) {
            this.backgroundContainer.y = this.scrollY;
        }
        if (this.wallContainer) {
            this.wallContainer.y = this.scrollY;
        }
        if (Array.isArray(this.outsideBackgroundLayers) && this.outsideBackgroundLayers.length > 0) {
            this.outsideBackgroundLayers.forEach(layer => {
                if (!layer || !layer.sprite) {
                    return;
                }

                const factor = Number.isFinite(layer.scrollFactor) ? layer.scrollFactor : 1;

                if (layer.isTileSprite && typeof layer.sprite.setTilePosition === 'function') {
                    const baseTileX = Number.isFinite(layer.baseTileX) ? layer.baseTileX : 0;
                    const baseTileY = Number.isFinite(layer.baseTileY) ? layer.baseTileY : 0;
                    const tileOffset = baseTileY - this.scrollY * factor;
                    layer.sprite.setTilePosition(baseTileX, tileOffset);
                    const baseY = Number.isFinite(layer.baseY) ? layer.baseY : layer.sprite.y;
                    layer.sprite.y = Math.round(baseY);
                    if (Number.isFinite(layer.baseX)) {
                        layer.sprite.x = Math.round(layer.baseX);
                    }
                    return;
                }

                const baseY = Number.isFinite(layer.baseY) ? layer.baseY : layer.sprite.y;
                const dynamicOffsetY = Number.isFinite(layer.dynamicOffsetY) ? layer.dynamicOffsetY : 0;
                const newY = baseY + this.scrollY * factor + dynamicOffsetY;
                layer.sprite.y = Math.round(newY);

                if (Number.isFinite(layer.baseX) || Number.isFinite(layer.dynamicOffsetX)) {
                    const baseX = Number.isFinite(layer.baseX) ? layer.baseX : layer.sprite.x;
                    const dynamicOffsetX = Number.isFinite(layer.dynamicOffsetX) ? layer.dynamicOffsetX : 0;
                    layer.sprite.x = Math.round(baseX + dynamicOffsetX);
                }
            });
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
        this.clearWallSprites();
        this.clearBackgroundSprite();
        this.clearOutsideBackgroundSprites();

        if (this.outsideBackgroundContainer) {
            this.outsideBackgroundContainer.destroy(true);
            this.outsideBackgroundContainer = null;
        }
        if (this.backgroundContainer) {
            this.backgroundContainer.destroy(true);
            this.backgroundContainer = null;
        }
        if (this.wallContainer) {
            this.wallContainer.destroy(true);
            this.wallContainer = null;
        }

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
