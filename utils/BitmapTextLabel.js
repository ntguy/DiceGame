const DEFAULT_FONT_SIZE = 24;

function parseFontSize(fontSize) {
    if (typeof fontSize === 'number' && Number.isFinite(fontSize)) {
        return fontSize;
    }
    if (typeof fontSize === 'string') {
        const match = fontSize.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            return Number.parseFloat(match[1]);
        }
    }
    return DEFAULT_FONT_SIZE;
}

function parseColor(color) {
    if (typeof color === 'number' && Number.isFinite(color)) {
        return color;
    }
    if (typeof color === 'string') {
        if (color.startsWith('#')) {
            return Number.parseInt(color.slice(1), 16);
        }
        return Number.parseInt(color, 16);
    }
    return 0xffffff;
}

function normalizePadding(padding) {
    if (!padding) {
        return { x: 0, y: 0 };
    }
    if (typeof padding === 'number') {
        return { x: padding, y: padding };
    }
    const x = Number.isFinite(padding.x) ? padding.x : 0;
    const y = Number.isFinite(padding.y) ? padding.y : 0;
    return { x, y };
}

export class BitmapTextLabel extends Phaser.GameObjects.Container {
    constructor(scene, x, y, text = '', style = {}) {
        super(scene, x, y);

        this.originX = 0;
        this.originY = 0;
        this.padding = { x: 0, y: 0 };
        this.background = null;
        this.backgroundAlpha = 1;
        this.backgroundColor = null;
        this.fixedWidth = null;
        this.fixedHeight = null;
        this.align = 'left';
        this.interactiveConfig = null;

        const fontSize = parseFontSize(style.fontSize);
        const initialText = typeof text === 'string' ? text : `${text}`;

        const label = scene.add.bitmapText(0, 0, 'boldPixels', initialText, fontSize);
        label.setOrigin(0, 0);
        label.setTint(0xffffff);

        // Remove from root display list; will be managed by container
        scene.children.remove(label);

        this.label = label;
        this.add(label);

        this.applyStyle(style);
        this.refreshLayout();

        scene.add.existing(this);
    }

    get contentWidth() {
        const bounds = this.label.getTextBounds();
        const width = bounds && bounds.local ? bounds.local.width : this.label.width;
        return Math.max(width, 0);
    }

    get contentHeight() {
        const bounds = this.label.getTextBounds();
        const height = bounds && bounds.local ? bounds.local.height : this.label.height;
        return Math.max(height, 0);
    }

    ensureBackground() {
        if (this.background) {
            return;
        }
        const bg = this.scene.add.rectangle(0, 0, 1, 1, 0xffffff, this.backgroundAlpha);
        bg.setOrigin(0, 0);
        this.scene.children.remove(bg);
        this.addAt(bg, 0);
        this.background = bg;
    }

    applyStyle(style = {}) {
        if (!style || typeof style !== 'object') {
            this.refreshLayout();
            return this;
        }

        if (style.fontSize !== undefined) {
            this.label.setFontSize(parseFontSize(style.fontSize));
        }

        if (style.color !== undefined) {
            this.label.setTint(parseColor(style.color));
        } else if (this.label.tintTopLeft === undefined) {
            this.label.setTint(0xffffff);
        }

        if (style.align) {
            this.setAlign(style.align);
        }

        if (style.lineSpacing !== undefined) {
            this.label.setLineSpacing(style.lineSpacing);
        }

        if (style.letterSpacing !== undefined) {
            this.label.setLetterSpacing(style.letterSpacing);
        }

        if (style.wordWrap && Number.isFinite(style.wordWrap.width)) {
            this.label.setMaxWidth(style.wordWrap.width);
        }
        if (Number.isFinite(style.maxWidth)) {
            this.label.setMaxWidth(style.maxWidth);
        }

        if (style.padding !== undefined) {
            this.padding = normalizePadding(style.padding);
        }

        if (style.backgroundColor !== undefined) {
            this.backgroundColor = parseColor(style.backgroundColor);
            this.backgroundAlpha = typeof style.backgroundAlpha === 'number'
                ? Phaser.Math.Clamp(style.backgroundAlpha, 0, 1)
                : 1;
            if (this.backgroundColor !== null) {
                this.ensureBackground();
                this.background.setFillStyle(this.backgroundColor, this.backgroundAlpha);
            }
        }

        this.refreshLayout();
        return this;
    }

    setStyle(style = {}) {
        return this.applyStyle(style);
    }

    setAlign(align) {
        const normalized = typeof align === 'string' ? align.toLowerCase() : 'left';
        this.align = normalized;
        if (normalized === 'center') {
            this.label.setCenterAlign();
        } else if (normalized === 'right') {
            this.label.setRightAlign();
        } else {
            this.label.setLeftAlign();
        }
        this.refreshLayout();
        return this;
    }

    setOrigin(x = 0, y = 0) {
        if (!Number.isFinite(x)) {
            x = 0;
        }
        if (!Number.isFinite(y)) {
            y = 0;
        }
        this.originX = x;
        this.originY = y;
        this.refreshLayout();
        return this;
    }

    setPadding(padding) {
        this.padding = normalizePadding(padding);
        this.refreshLayout();
        return this;
    }

    setFixedSize(width, height) {
        this.fixedWidth = Number.isFinite(width) ? width : null;
        this.fixedHeight = Number.isFinite(height) ? height : null;
        this.refreshLayout();
        return this;
    }

    setInteractive(hitArea, callback, dropZone) {
        if (hitArea && typeof hitArea === 'object' && typeof hitArea.contains !== 'function') {
            this.interactiveConfig = { ...hitArea };
            this.applyInteractiveFromConfig(dropZone);
            return this;
        }

        this.interactiveConfig = null;
        return super.setInteractive(hitArea, callback, dropZone);
    }

    applyInteractiveFromConfig(dropZone) {
        if (!this.interactiveConfig || typeof Phaser === 'undefined' || !Phaser.Geom || !Phaser.Geom.Rectangle) {
            return;
        }

        const width = this.width || 0;
        const height = this.height || 0;
        const rect = new Phaser.Geom.Rectangle(
            -width * this.originX,
            -height * this.originY,
            width,
            height
        );

        super.setInteractive(rect, Phaser.Geom.Rectangle.Contains, dropZone);

        if (this.input && this.interactiveConfig.useHandCursor) {
            this.input.cursor = 'pointer';
        }
    }

    setText(value) {
        const text = value === undefined || value === null ? '' : `${value}`;
        this.label.setText(text);
        this.refreshLayout();
        return this;
    }

    setFontSize(size) {
        this.label.setFontSize(parseFontSize(size));
        this.refreshLayout();
        return this;
    }

    setTint(color) {
        this.label.setTint(parseColor(color));
        return this;
    }

    setLetterSpacing(value) {
        this.label.setLetterSpacing(value);
        this.refreshLayout();
        return this;
    }

    setLineSpacing(value) {
        this.label.setLineSpacing(value);
        this.refreshLayout();
        return this;
    }

    getText() {
        return this.label.text;
    }

    getFontSize() {
        return this.label.fontSize;
    }

    refreshLayout() {
        const paddingX = this.padding.x || 0;
        const paddingY = this.padding.y || 0;

        const rawWidth = this.contentWidth;
        const rawHeight = this.contentHeight;

        const baseWidth = this.fixedWidth !== null ? this.fixedWidth : rawWidth;
        const baseHeight = this.fixedHeight !== null ? this.fixedHeight : rawHeight;

        const totalWidth = baseWidth + paddingX * 2;
        const totalHeight = baseHeight + paddingY * 2;

        const offsetX = -totalWidth * this.originX;
        const offsetY = -totalHeight * this.originY;

        if (this.background) {
            this.background.setOrigin(0, 0);
            this.background.setPosition(offsetX, offsetY);
            this.background.setSize(totalWidth, totalHeight);
            this.background.displayWidth = totalWidth;
            this.background.displayHeight = totalHeight;
        }

        const labelX = offsetX + paddingX;
        const labelY = offsetY + paddingY;
        this.label.setPosition(labelX, labelY);

        this.setSize(totalWidth, totalHeight);

        if (this.interactiveConfig) {
            this.applyInteractiveFromConfig(this.input ? this.input.dropZone : undefined);
        } else if (this.input && this.input.hitArea) {
            super.setInteractive(this.input.hitArea, this.input.hitAreaCallback, this.input.dropZone);
        }
    }

    destroy(fromScene) {
        if (this.background && !this.background.destroyed) {
            this.background.destroy();
            this.background = null;
        }
        if (this.label && !this.label.destroyed) {
            this.label.destroy();
            this.label = null;
        }
        super.destroy(fromScene);
    }
}

export function createBitmapText(scene, x, y, text, style = {}) {
    return new BitmapTextLabel(scene, x, y, text, style);
}

