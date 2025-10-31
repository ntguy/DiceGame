const WHITE = 0xffffff;
const BLACK = 0x000000;

function getColorObject(color) {
    if (typeof Phaser === 'undefined' || !Phaser.Display || !Phaser.Display.Color) {
        throw new Error('Phaser is required for button styling utilities.');
    }
    if (typeof color === 'string') {
        const normalized = color.startsWith('#') ? color : `#${color}`;
        return Phaser.Display.Color.HexStringToColor(normalized);
    }
    return Phaser.Display.Color.IntegerToColor(color);
}

function toHexString(colorObj) {
    return Phaser.Display.Color.RGBToString(
        Math.round(colorObj.red),
        Math.round(colorObj.green),
        Math.round(colorObj.blue),
        255,
        '#'
    );
}

function toInt(colorObj) {
    return Phaser.Display.Color.GetColor(
        Math.round(colorObj.red),
        Math.round(colorObj.green),
        Math.round(colorObj.blue)
    );
}

function blendColor(baseColor, mixColor, amount) {
    const clamped = Phaser.Math.Clamp(amount, 0, 1);
    const base = getColorObject(baseColor);
    const mix = getColorObject(mixColor);

    const red = Phaser.Math.Linear(base.red, mix.red, clamped);
    const green = Phaser.Math.Linear(base.green, mix.green, clamped);
    const blue = Phaser.Math.Linear(base.blue, mix.blue, clamped);

    const blended = { red, green, blue };
    return {
        hex: toHexString(blended),
        int: toInt(blended)
    };
}

function lightenColor(color, amount) {
    return blendColor(color, WHITE, amount);
}

function darkenColor(color, amount) {
    return blendColor(color, BLACK, amount);
}

function getPadding(gameObject) {
    if (!gameObject || typeof gameObject.getData !== 'function') {
        return { x: 0, y: 0 };
    }
    const padding = gameObject.getData('padding');
    if (!padding) {
        return { x: 0, y: 0 };
    }
    const x = typeof padding.x === 'number' ? padding.x : 0;
    const y = typeof padding.y === 'number' ? padding.y : 0;
    return { x, y };
}

function getBitmapTextBounds(text) {
    if (!text || typeof text.getTextBounds !== 'function') {
        return { width: text.width || 0, height: text.height || 0 };
    }
    const bounds = text.getTextBounds(true);
    if (bounds && bounds.global) {
        return {
            width: bounds.global.width,
            height: bounds.global.height
        };
    }
    return {
        width: text.width || 0,
        height: text.height || 0
    };
}

function ensureButtonBackground(button, width, height, colorInt, alpha) {
    const scene = button.scene;
    let background = button.getData && button.getData('textButtonBackground');
    if (!background && scene && scene.add && typeof scene.add.rectangle === 'function') {
        background = scene.add.rectangle(button.x, button.y, width, height, colorInt, alpha)
            .setOrigin(button.originX, button.originY);
        background.setDepth(button.depth - 1);
        background.setScrollFactor(button.scrollFactorX ?? 1, button.scrollFactorY ?? 1);
        if (button.getData) {
            button.setData('textButtonBackground', background);
        }

        if (typeof button.on === 'function') {
            button.on('positionupdate', () => {
                background.setPosition(button.x, button.y);
            });
            button.once('destroy', () => {
                background.destroy();
            });
        }
    }
    return background;
}

function updateButtonBackgroundSize(button, background, width, height) {
    if (!background) {
        return;
    }
    background.setSize(width, height);
    background.setDisplaySize(width, height);
}

function setBitmapTextTint(text, color) {
    if (!text || typeof text.setTint !== 'function') {
        return;
    }
    if (color == null) {
        text.clearTint();
        return;
    }
    const colorObject = getColorObject(color);
    text.setTint(toInt(colorObject));
}

function updateHitArea(button, width, height) {
    if (!button || typeof button.setInteractive !== 'function' || typeof Phaser === 'undefined') {
        return;
    }

    const originX = typeof button.originX === 'number' ? button.originX : 0;
    const originY = typeof button.originY === 'number' ? button.originY : 0;
    const rect = new Phaser.Geom.Rectangle(-width * originX, -height * originY, width, height);
    button.setInteractive({
        hitArea: rect,
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
    });
}

export function applyTextButtonStyle(button, {
    baseColor = '#ffffff',
    textColor,
    hoverBlend = 0.12,
    pressBlend = 0.2,
    disabledBlend = 0.25,
    enabledAlpha = 1,
    disabledAlpha = 0.45,
    pressOffset = 2
} = {}) {
    if (!button) {
        return;
    }

    const baseColorObject = getColorObject(baseColor);
    const baseColorHex = toHexString(baseColorObject);
    const baseColorInt = toInt(baseColorObject);
    const hoverColor = lightenColor(baseColorHex, hoverBlend);
    const pressedColor = darkenColor(baseColorHex, pressBlend);
    const disabledColor = darkenColor(baseColorHex, disabledBlend);

    const padding = getPadding(button);
    const bounds = getBitmapTextBounds(button);
    const width = (button.getData && button.getData('buttonWidth')) || bounds.width + padding.x * 2;
    const height = (button.getData && button.getData('buttonHeight')) || bounds.height + padding.y * 2;

    const background = ensureButtonBackground(button, width, height, baseColorInt, enabledAlpha);
    updateButtonBackgroundSize(button, background, width, height);

    setBitmapTextTint(button, textColor);
    if (background) {
        background.setFillStyle(baseColorInt, enabledAlpha);
    }
    button.setAlpha(enabledAlpha);

    updateHitArea(button, width, height);

    const state = {
        baseColor: baseColorHex,
        baseColorInt,
        hoverColor,
        pressedColor,
        disabledColor,
        enabledAlpha,
        disabledAlpha,
        baseY: button.y,
        pressOffset,
        background,
        width,
        height
    };

    button.setDataEnabled();
    button.setData('textButtonStyle', state);

    const handlePointerOver = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        if (state.background) {
            state.background.setFillStyle(state.hoverColor.int, 1);
        }
        button.setAlpha(state.enabledAlpha);
    };

    const restoreIdleState = () => {
        const isEnabled = button.input && button.input.enabled;
        if (state.background) {
            const fillColor = isEnabled ? state.baseColorInt : state.disabledColor.int;
            state.background.setFillStyle(fillColor, 1);
        }
        button.setAlpha(isEnabled ? state.enabledAlpha : state.disabledAlpha);
        button.setY(state.baseY);
    };

    const handlePointerDown = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        if (state.background) {
            state.background.setFillStyle(state.pressedColor.int, 1);
        }
        button.setY(state.baseY + state.pressOffset);
    };

    const handlePointerUp = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        if (state.background) {
            state.background.setFillStyle(state.hoverColor.int, 1);
        }
        button.setAlpha(state.enabledAlpha);
        button.setY(state.baseY);
    };

    button.on('pointerover', handlePointerOver);
    button.on('pointerout', restoreIdleState);
    button.on('pointerdown', handlePointerDown);
    button.on('pointerup', handlePointerUp);
    button.on('pointerupoutside', restoreIdleState);

    return state;
}

export function setTextButtonEnabled(button, enabled, overrides = {}) {
    if (!button) {
        return;
    }

    const state = button.getData && button.getData('textButtonStyle');
    if (!state) {
        return;
    }

    if (typeof overrides.enabledAlpha === 'number') {
        state.enabledAlpha = overrides.enabledAlpha;
    }
    if (typeof overrides.disabledAlpha === 'number') {
        state.disabledAlpha = overrides.disabledAlpha;
    }
    if (typeof overrides.disabledBlend === 'number') {
        state.disabledColor = darkenColor(state.baseColor, overrides.disabledBlend);
    }

    if (enabled) {
        updateHitArea(button, state.width, state.height);
        if (state.background) {
            state.background.setFillStyle(state.baseColorInt, 1);
        }
        button.setAlpha(state.enabledAlpha);
        button.setY(state.baseY);
    } else {
        button.disableInteractive();
        if (state.background) {
            state.background.setFillStyle(state.disabledColor.int, 1);
        }
        button.setAlpha(state.disabledAlpha);
        button.setY(state.baseY);
    }
}

export function applyRectangleButtonStyle(rectangle, {
    baseColor = 0xffffff,
    baseAlpha = 1,
    hoverBlend = 0.12,
    pressBlend = 0.2,
    disabledBlend = 0.25,
    enabledAlpha = 1,
    disabledAlpha = 0.5
} = {}) {
    if (!rectangle) {
        return;
    }

    const baseFormats = getColorObject(baseColor);
    const baseColorInt = toInt(baseFormats);
    const hoverColorInt = lightenColor(baseColorInt, hoverBlend).int;
    const pressedColorInt = darkenColor(baseColorInt, pressBlend).int;
    const disabledColorInt = darkenColor(baseColorInt, disabledBlend).int;

    const state = {
        baseColor: baseColorInt,
        hoverColor: hoverColorInt,
        pressedColor: pressedColorInt,
        disabledColor: disabledColorInt,
        baseAlpha,
        enabledAlpha,
        disabledAlpha
    };

    rectangle.setDataEnabled();
    rectangle.setData('rectButtonStyle', state);
    rectangle.setFillStyle(baseColorInt, baseAlpha);
    rectangle.setAlpha(enabledAlpha);

    const applyIdleState = () => {
        const isEnabled = rectangle.input && rectangle.input.enabled;
        rectangle.setFillStyle(isEnabled ? state.baseColor : state.disabledColor, state.baseAlpha);
        rectangle.setAlpha(isEnabled ? state.enabledAlpha : state.disabledAlpha);
    };

    const handlePointerOver = () => {
        if (!rectangle.input || !rectangle.input.enabled) {
            return;
        }
        rectangle.setFillStyle(state.hoverColor, state.baseAlpha);
        rectangle.setAlpha(state.enabledAlpha);
    };

    const handlePointerDown = () => {
        if (!rectangle.input || !rectangle.input.enabled) {
            return;
        }
        rectangle.setFillStyle(state.pressedColor, state.baseAlpha);
    };

    const handlePointerUp = () => {
        if (!rectangle.input || !rectangle.input.enabled) {
            return;
        }
        rectangle.setFillStyle(state.hoverColor, state.baseAlpha);
        rectangle.setAlpha(state.enabledAlpha);
    };

    rectangle.on('pointerover', handlePointerOver);
    rectangle.on('pointerout', applyIdleState);
    rectangle.on('pointerdown', handlePointerDown);
    rectangle.on('pointerup', handlePointerUp);
    rectangle.on('pointerupoutside', applyIdleState);

    return state;
}

export function setRectangleButtonEnabled(rectangle, enabled, overrides = {}) {
    if (!rectangle) {
        return;
    }

    const state = rectangle.getData && rectangle.getData('rectButtonStyle');
    if (!state) {
        return;
    }

    if (typeof overrides.disabledAlpha === 'number') {
        state.disabledAlpha = overrides.disabledAlpha;
    }
    if (typeof overrides.enabledAlpha === 'number') {
        state.enabledAlpha = overrides.enabledAlpha;
    }
    if (typeof overrides.disabledBlend === 'number') {
        state.disabledColor = darkenColor(state.baseColor, overrides.disabledBlend).int;
    }
    if (typeof overrides.baseColor === 'number') {
        state.baseColor = overrides.baseColor;
    }
    if (typeof overrides.baseAlpha === 'number') {
        state.baseAlpha = overrides.baseAlpha;
    }

    if (enabled) {
        rectangle.setInteractive({ useHandCursor: true });
        rectangle.setFillStyle(state.baseColor, state.baseAlpha);
        rectangle.setAlpha(state.enabledAlpha);
    } else {
        rectangle.disableInteractive();
        rectangle.setFillStyle(state.disabledColor, state.baseAlpha);
        rectangle.setAlpha(state.disabledAlpha);
    }
}
