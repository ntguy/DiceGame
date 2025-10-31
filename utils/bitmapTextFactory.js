const FONT_KEY = 'boldPixels';
const DEFAULT_FONT_SIZE = 16;
const ASCII_SAFE_REGEX = /[^\u0009\u000A\u000D\u0020-\u007E]/;

function parseFontSize(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const match = value.match(/\d+/);
        if (match) {
            const parsed = parseInt(match[0], 10);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return undefined;
}

function parsePadding(value) {
    if (value === null || value === undefined) {
        return { x: 0, y: 0 };
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        const clamped = Math.max(0, value);
        return { x: clamped, y: clamped };
    }

    if (typeof value === 'object') {
        const { x, y, left, right, top, bottom } = value;
        const horizontal = [x, left, right].find((entry) => typeof entry === 'number' && Number.isFinite(entry));
        const vertical = [y, top, bottom].find((entry) => typeof entry === 'number' && Number.isFinite(entry));
        return {
            x: Math.max(0, horizontal || 0),
            y: Math.max(0, vertical || 0)
        };
    }

    return { x: 0, y: 0 };
}

function extractTextContent(text) {
    if (text === null || text === undefined) {
        return '';
    }

    if (Array.isArray(text)) {
        return text.map((entry) => extractTextContent(entry)).join('');
    }

    return String(text);
}

function containsUnsupportedCharacters(text) {
    const normalized = extractTextContent(text);
    return ASCII_SAFE_REGEX.test(normalized);
}

function resolveColor(color) {
    if (typeof Phaser === 'undefined' || !Phaser.Display || !Phaser.Display.Color) {
        return 0xffffff;
    }
    if (typeof color === 'number') {
        return color;
    }
    if (typeof color === 'string') {
        const normalized = color.startsWith('#') ? color : `#${color}`;
        return Phaser.Display.Color.HexStringToColor(normalized).color;
    }
    return 0xffffff;
}

function applyBitmapTextStyle(target, style = {}, { allowFontSize = true } = {}) {
    if (!target || !style) {
        return;
    }

    if (allowFontSize && style.fontSize !== undefined) {
        const size = parseFontSize(style.fontSize);
        if (Number.isFinite(size)) {
            target.setFontSize(size);
        }
    }

    if (style.padding !== undefined && typeof target.setPadding === 'function') {
        target.setPadding(style.padding);
    }

    if (style.color !== undefined) {
        target.setTint(resolveColor(style.color));
    } else if (style.fill !== undefined) {
        target.setTint(resolveColor(style.fill));
    }

    if (style.align) {
        const align = String(style.align).toLowerCase();
        if (align === 'center' && typeof target.setCenterAlign === 'function') {
            target.setCenterAlign();
        } else if (align === 'right' && typeof target.setRightAlign === 'function') {
            target.setRightAlign();
        } else if (typeof target.setLeftAlign === 'function') {
            target.setLeftAlign();
        }
    }

    if (style.wordWrap && typeof style.wordWrap.width === 'number' && typeof target.setMaxWidth === 'function') {
        target.setMaxWidth(style.wordWrap.width);
    }

    if (typeof style.letterSpacing === 'number' && typeof target.setLetterSpacing === 'function') {
        target.setLetterSpacing(style.letterSpacing);
    }

    if (typeof style.lineSpacing === 'number' && typeof target.setLineSpacing === 'function') {
        target.setLineSpacing(style.lineSpacing);
    }

    if (typeof style.maxLines === 'number') {
        target.maxLines = style.maxLines;
    }
}

function installBitmapTextFactory() {
    if (typeof Phaser === 'undefined' || !Phaser.GameObjects || !Phaser.GameObjects.GameObjectFactory) {
        return;
    }

    const factory = Phaser.GameObjects.GameObjectFactory.prototype;
    if (factory.__boldPixelsPatched) {
        return;
    }

    factory.__boldPixelsPatched = true;
    const originalTextFactory = typeof factory.text === 'function' ? factory.text : null;

    factory.text = function textFactory(x, y, text, style = {}) {
        if (containsUnsupportedCharacters(text) && typeof originalTextFactory === 'function') {
            return originalTextFactory.call(this, x, y, text, style);
        }

        const fontSize = parseFontSize(style.fontSize) || DEFAULT_FONT_SIZE;
        const textObject = this.bitmapText(x, y, FONT_KEY, text, fontSize);

        const initialPadding = parsePadding(style.padding);
        textObject.__bitmapPadding = initialPadding;
        textObject.padding = { ...initialPadding };

        textObject.setPadding = function setPadding(padding) {
            const resolved = parsePadding(padding);
            textObject.__bitmapPadding = resolved;
            textObject.padding = { ...resolved };
            return textObject;
        };

        if (textObject && typeof textObject.setTint === 'function') {
            textObject.setTint(resolveColor(style.color !== undefined ? style.color : 0xffffff));
        }

        applyBitmapTextStyle(textObject, style, { allowFontSize: false });

        textObject.setStyle = function setStyle(newStyle = {}) {
            applyBitmapTextStyle(textObject, newStyle, { allowFontSize: true });
            return textObject;
        };

        textObject.setFixedSize = function setFixedSize(width, height) {
            const resolvedWidth = Number.isFinite(width) ? width : textObject.width;
            const resolvedHeight = Number.isFinite(height) ? height : textObject.height;
            if (typeof textObject.setSize === 'function') {
                textObject.setSize(resolvedWidth, resolvedHeight);
            }
            textObject._fixedWidth = resolvedWidth;
            textObject._fixedHeight = resolvedHeight;
            return textObject;
        };

        return textObject;
    };
}

installBitmapTextFactory();

function getBitmapTint(color) {
    return resolveColor(color);
}

export { installBitmapTextFactory, getBitmapTint };
