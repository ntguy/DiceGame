const DEFAULT_FONT = 'boldPixels';
const DEFAULT_FONT_SIZE = 16;

function parseFontSize(fontSize) {
    if (typeof fontSize === 'number') {
        return fontSize;
    }
    if (typeof fontSize === 'string') {
        const match = fontSize.match(/([0-9]+)(px)?/i);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    return DEFAULT_FONT_SIZE;
}

function parseColor(color) {
    if (color == null) {
        return null;
    }
    if (typeof color === 'number') {
        return color;
    }
    if (typeof color === 'string') {
        const trimmed = color.trim();
        if (trimmed.startsWith('#')) {
            return parseInt(trimmed.slice(1), 16);
        }
        if (trimmed.startsWith('0x')) {
            return parseInt(trimmed.slice(2), 16);
        }
    }
    return null;
}

function applyAlignment(bitmapText, align) {
    if (!bitmapText || !align) {
        return;
    }
    const normalized = typeof align === 'string' ? align.toLowerCase() : align;
    switch (normalized) {
    case 'center':
        if (typeof bitmapText.setCenterAlign === 'function') {
            bitmapText.setCenterAlign();
        }
        break;
    case 'right':
        if (typeof bitmapText.setRightAlign === 'function') {
            bitmapText.setRightAlign();
        }
        break;
    case 'left':
        if (typeof bitmapText.setLeftAlign === 'function') {
            bitmapText.setLeftAlign();
        }
        break;
    default:
        break;
    }
}

function applyOptionalStyle(bitmapText, style = {}) {
    if (!bitmapText) {
        return;
    }

    const tint = parseColor(style.color);
    if (tint != null && typeof bitmapText.setTint === 'function') {
        bitmapText.setTint(tint);
    } else if (typeof bitmapText.clearTint === 'function') {
        bitmapText.clearTint();
    }

    applyAlignment(bitmapText, style.align);

    if (typeof style.letterSpacing === 'number' && typeof bitmapText.setLetterSpacing === 'function') {
        bitmapText.setLetterSpacing(style.letterSpacing);
    }
    if (typeof style.lineSpacing === 'number' && typeof bitmapText.setLineSpacing === 'function') {
        bitmapText.setLineSpacing(style.lineSpacing);
    }
    if (typeof style.maxWidth === 'number' && typeof bitmapText.setMaxWidth === 'function') {
        bitmapText.setMaxWidth(style.maxWidth);
    } else if (style.wordWrap && typeof style.wordWrap.width === 'number' && typeof bitmapText.setMaxWidth === 'function') {
        bitmapText.setMaxWidth(style.wordWrap.width);
    }

    if (style.padding && typeof bitmapText.setData === 'function') {
        bitmapText.setData('padding', style.padding);
    } else if (typeof bitmapText.setData === 'function' && !bitmapText.getData('padding')) {
        bitmapText.setData('padding', { x: 0, y: 0 });
    }
}

export function createBitmapText(scene, x, y, text, style = {}, fontSizeOverride) {
    if (!scene || !scene.add || typeof scene.add.bitmapText !== 'function') {
        throw new Error('A valid Phaser scene is required to create bitmap text.');
    }

    const fontSize = fontSizeOverride != null ? fontSizeOverride : parseFontSize(style.fontSize);
    const content = text == null ? '' : text;
    const bitmapText = scene.add.bitmapText(x, y, DEFAULT_FONT, content, fontSize);
    applyOptionalStyle(bitmapText, style);
    return bitmapText;
}

export function updateBitmapTextStyle(bitmapText, style = {}) {
    if (!bitmapText) {
        return bitmapText;
    }
    if (style.fontSize != null && typeof bitmapText.setFontSize === 'function') {
        bitmapText.setFontSize(parseFontSize(style.fontSize));
    }
    applyOptionalStyle(bitmapText, style);
    return bitmapText;
}
