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

    const baseTextColor = textColor || baseColor || '#ffffff';
    const baseTint = toInt(getColorObject(baseTextColor));
    const hoverTint = lightenColor(baseTextColor, hoverBlend).int;
    const pressedTint = darkenColor(baseTextColor, pressBlend).int;
    const disabledTint = darkenColor(baseTextColor, disabledBlend).int;

    const state = {
        baseTint,
        hoverTint,
        pressedTint,
        disabledTint,
        enabledAlpha,
        disabledAlpha,
        baseY: button.y,
        pressOffset
    };

    button.setDataEnabled();
    button.setData('textButtonStyle', state);

    button.setTint(baseTint);
    button.setAlpha(enabledAlpha);

    const handlePointerOver = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.hoverTint);
        button.setAlpha(state.enabledAlpha);
    };

    const restoreIdleState = () => {
        const isEnabled = button.input && button.input.enabled;
        button.setTint(isEnabled ? state.baseTint : state.disabledTint);
        button.setAlpha(isEnabled ? state.enabledAlpha : state.disabledAlpha);
        button.setY(state.baseY);
    };

    const handlePointerDown = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.pressedTint);
        button.setY(state.baseY + state.pressOffset);
    };

    const handlePointerUp = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.hoverTint);
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
        state.disabledTint = darkenColor(state.baseTint, overrides.disabledBlend).int;
    }

    if (enabled) {
        button.setInteractive({ useHandCursor: true });
        button.setTint(state.baseTint);
        button.setAlpha(state.enabledAlpha);
        button.setY(state.baseY);
    } else {
        button.disableInteractive();
        button.setTint(state.disabledTint);
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
