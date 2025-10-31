const DEFAULT_FONT_KEY = 'boldPixels';
const DEFAULT_FONT_SIZE = 24;

function parseFontSize(fontSize) {
    if (typeof fontSize === 'number') {
        return fontSize;
    }
    if (typeof fontSize === 'string') {
        const match = fontSize.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (match) {
            return parseFloat(match[1]);
        }
    }
    return DEFAULT_FONT_SIZE;
}

function parsePadding(padding) {
    if (padding == null) {
        return { x: 0, y: 0 };
    }
    if (typeof padding === 'number') {
        return { x: padding, y: padding };
    }
    const horizontal = padding.x != null
        ? padding.x
        : Math.max(padding.left ?? 0, padding.right ?? 0);
    const vertical = padding.y != null
        ? padding.y
        : Math.max(padding.top ?? 0, padding.bottom ?? 0);
    return { x: horizontal, y: vertical };
}

function toColorInt(value) {
    if (value == null) {
        return null;
    }
    const color = Phaser.Display.Color.ValueToColor(value);
    return { color: color.color, alpha: color.alphaGL };
}

function applyStyle(target, style = {}) {
    if ('fontSize' in style) {
        target.setFontSize(parseFontSize(style.fontSize));
    }

    if ('color' in style) {
        const colorInfo = toColorInt(style.color);
        if (colorInfo) {
            target.setTint(colorInfo.color);
        } else {
            target.clearTint();
        }
    }

    if ('align' in style) {
        const align = typeof style.align === 'string'
            ? style.align.toLowerCase()
            : '';
        if (align === 'center') {
            target.setCenterAlign();
        } else if (align === 'right') {
            target.setRightAlign();
        } else {
            target.setLeftAlign();
        }
    }

    if ('wordWrap' in style) {
        const width = style.wordWrap && typeof style.wordWrap.width === 'number'
            ? style.wordWrap.width
            : 0;
        target.setMaxWidth(width > 0 ? width : 0);
    }

    if ('padding' in style) {
        target.setData('__padding', parsePadding(style.padding));
    }

    if ('lineSpacing' in style) {
        target.setData('__lineSpacing', style.lineSpacing);
    }
}

function patchMethod(proto, methodName, eventName) {
    const original = proto[methodName];
    if (typeof original !== 'function') {
        return;
    }
    proto[methodName] = function patchedMethod(...args) {
        const result = original.apply(this, args);
        if (this.emit && eventName) {
            this.emit(eventName);
        }
        return result;
    };
}

export function initializePixelText() {
    if (initializePixelText.__initialized) {
        return;
    }
    if (typeof Phaser === 'undefined' || !Phaser.GameObjects || !Phaser.GameObjects.GameObjectFactory) {
        throw new Error('Phaser must be loaded before initializing pixel text support.');
    }

    const factory = Phaser.GameObjects.GameObjectFactory.prototype;

    factory.text = function pixelTextFactory(x, y, text, style = {}) {
        const fontSize = parseFontSize(style.fontSize);
        const bitmapText = this.bitmapText(x, y, DEFAULT_FONT_KEY, text, fontSize);
        bitmapText.setOrigin(0, 0);
        bitmapText.setDataEnabled();
        bitmapText.setData('__style', { ...style });
        bitmapText.setData('__padding', parsePadding(style.padding));
        bitmapText.setData('__lineSpacing', style.lineSpacing ?? 0);
        applyStyle(bitmapText, style);
        return bitmapText;
    };

    Phaser.GameObjects.BitmapText.prototype.setStyle = function setStyle(style = {}) {
        const currentStyle = this.getData('__style') || {};
        const mergedStyle = { ...currentStyle, ...style };
        this.setData('__style', mergedStyle);
        applyStyle(this, style);
        if (this.emit) {
            this.emit('pixeltextstylechange', style);
        }
        return this;
    };

    Phaser.GameObjects.BitmapText.prototype.getPixelPadding = function getPixelPadding() {
        return this.getData('__padding') || { x: 0, y: 0 };
    };

    if (typeof Phaser.GameObjects.BitmapText.prototype.setFixedSize !== 'function') {
        Phaser.GameObjects.BitmapText.prototype.setFixedSize = function setFixedSize(width, height) {
            this.setData('__fixedSize', { width, height });
            return this;
        };
    }

    // Emit events when metrics or transforms change so dependent systems can react.
    const proto = Phaser.GameObjects.BitmapText.prototype;
    patchMethod(proto, 'setText', 'pixeltextmetricschange');
    patchMethod(proto, 'setFontSize', 'pixeltextmetricschange');
    patchMethod(proto, 'setMaxWidth', 'pixeltextmetricschange');
    patchMethod(proto, 'setLetterSpacing', 'pixeltextmetricschange');

    patchMethod(proto, 'setScale', 'pixeltexttransformchange');
    patchMethod(proto, 'setDisplaySize', 'pixeltexttransformchange');
    patchMethod(proto, 'setPosition', 'pixeltexttransformchange');
    patchMethod(proto, 'setX', 'pixeltexttransformchange');
    patchMethod(proto, 'setY', 'pixeltexttransformchange');
    patchMethod(proto, 'setOrigin', 'pixeltexttransformchange');
    patchMethod(proto, 'setScrollFactor', 'pixeltexttransformchange');
    patchMethod(proto, 'setDepth', 'pixeltexttransformchange');
    patchMethod(proto, 'setAlpha', 'pixeltextalphachange');
    patchMethod(proto, 'setVisible', 'pixeltextvisibilitychange');

    initializePixelText.__initialized = true;
}
