const WHITE = 0xffffff;
const BLACK = 0x000000;

function getColorObject(color) {
    if (typeof Phaser === 'undefined' || !Phaser.Display || !Phaser.Display.Color) {
        throw new Error('Phaser is required for button styling utilities.');
    }
    return Phaser.Display.Color.ValueToColor(color);
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

function getButtonPadding(button) {
    if (!button || typeof button.getPixelPadding !== 'function') {
        return { x: 0, y: 0 };
    }
    return button.getPixelPadding();
}

function measureButton(button) {
    if (!button) {
        return { width: 0, height: 0 };
    }
    const bounds = button.getTextBounds ? button.getTextBounds() : null;
    if (bounds && bounds.local) {
        return {
            width: bounds.local.width,
            height: bounds.local.height
        };
    }
    return {
        width: button.width ?? 0,
        height: button.height ?? 0
    };
}

function ensureBackground(button, state) {
    if (!button || !button.scene) {
        return null;
    }
    if (state.background && !state.background.destroyed) {
        return state.background;
    }

    const { color: baseColorInt } = getColorObject(state.baseColor);
    const background = button.scene.add.rectangle(button.x, button.y, 1, 1, baseColorInt, 1);
    background.setOrigin(button.originX, button.originY);
    background.setScrollFactor(button.scrollFactorX, button.scrollFactorY);
    background.setDepth(button.depth - 0.001);
    background.setVisible(button.visible);
    background.setActive(button.active);
    background.setAlpha(button.alpha);

    state.background = background;

    const parent = button.parentContainer;
    if (parent) {
        const index = parent.getIndex(button);
        parent.addAt(background, Math.max(0, index));
    }

    const syncParent = () => {
        if (!state.background || state.background.destroyed) {
            return;
        }
        const container = button.parentContainer;
        if (container) {
            if (state.background.parentContainer !== container) {
                if (state.background.parentContainer) {
                    state.background.parentContainer.remove(state.background);
                }
                const insertIndex = container.getIndex(button);
                container.addAt(state.background, Math.max(0, insertIndex));
            }
        } else if (state.background.parentContainer) {
            state.background.parentContainer.remove(state.background);
            button.scene.children.add(state.background);
        }
        state.background.setDepth(button.depth - 0.001);
    };

    const updateMetrics = () => {
        if (!state.background || state.background.destroyed) {
            return;
        }
        const padding = getButtonPadding(button);
        const metrics = measureButton(button);
        const width = Math.max(1, metrics.width + padding.x * 2);
        const height = Math.max(1, metrics.height + padding.y * 2);
        state.background.setDisplaySize(width * button.scaleX, height * button.scaleY);

        const offsetX = padding.x * button.scaleX * (2 * button.originX - 1);
        const offsetY = padding.y * button.scaleY * (2 * button.originY - 1);
        state.background.setOrigin(button.originX, button.originY);
        state.background.setPosition(button.x + offsetX, button.y + offsetY);
        state.background.setScrollFactor(button.scrollFactorX, button.scrollFactorY);

        state.hitAreaWidth = width;
        state.hitAreaHeight = height;

        if (button.input && button.input.enabled && state.hitAreaWidth && state.hitAreaHeight) {
            button.input.hitArea = new Phaser.Geom.Rectangle(
                -button.originX * state.hitAreaWidth,
                -button.originY * state.hitAreaHeight,
                state.hitAreaWidth,
                state.hitAreaHeight
            );
            button.input.hitAreaCallback = Phaser.Geom.Rectangle.Contains;
        }
    };

    const syncVisibility = () => {
        if (!state.background || state.background.destroyed) {
            return;
        }
        state.background.setVisible(button.visible);
    };

    const syncAlpha = () => {
        if (!state.background || state.background.destroyed) {
            return;
        }
        state.background.setAlpha(button.alpha);
    };

    syncParent();
    updateMetrics();
    syncAlpha();

    const metricsHandler = () => updateMetrics();
    const transformHandler = () => {
        syncParent();
        updateMetrics();
        syncAlpha();
    };
    const alphaHandler = () => syncAlpha();
    const visibilityHandler = () => syncVisibility();

    button.on('pixeltextmetricschange', metricsHandler);
    button.on('pixeltexttransformchange', transformHandler);
    button.on('pixeltextalphachange', alphaHandler);
    button.on('pixeltextvisibilitychange', visibilityHandler);
    button.on('destroy', () => {
        button.off('pixeltextmetricschange', metricsHandler);
        button.off('pixeltexttransformchange', transformHandler);
        button.off('pixeltextalphachange', alphaHandler);
        button.off('pixeltextvisibilitychange', visibilityHandler);
        if (state.background && !state.background.destroyed) {
            state.background.destroy();
        }
    });

    return background;
}

function applyButtonTint(state, color) {
    if (!state.background || state.background.destroyed) {
        return;
    }
    const { color: colorInt } = getColorObject(color);
    state.background.setFillStyle(colorInt, 1);
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

    const baseColorHex = toHexString(getColorObject(baseColor));
    const hoverColorHex = lightenColor(baseColorHex, hoverBlend).hex;
    const pressedColorHex = darkenColor(baseColorHex, pressBlend).hex;
    const disabledColorHex = darkenColor(baseColorHex, disabledBlend).hex;

    const state = {
        baseColor: baseColorHex,
        hoverColor: hoverColorHex,
        pressedColor: pressedColorHex,
        disabledColor: disabledColorHex,
        enabledAlpha,
        disabledAlpha,
        baseY: button.y,
        pressOffset,
        background: null,
        hitAreaWidth: 0,
        hitAreaHeight: 0
    };

    button.setDataEnabled();
    button.setData('textButtonStyle', state);

    if (textColor) {
        button.setStyle({ color: textColor });
    }
    button.setAlpha(enabledAlpha);

    ensureBackground(button, state);
    applyButtonTint(state, state.baseColor);

    const handlePointerOver = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        applyButtonTint(state, state.hoverColor);
        button.setAlpha(state.enabledAlpha);
    };

    const restoreIdleState = () => {
        const isEnabled = button.input && button.input.enabled;
        applyButtonTint(state, isEnabled ? state.baseColor : state.disabledColor);
        button.setAlpha(isEnabled ? state.enabledAlpha : state.disabledAlpha);
        button.setY(state.baseY);
    };

    const handlePointerDown = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        applyButtonTint(state, state.pressedColor);
        button.setY(state.baseY + state.pressOffset);
    };

    const handlePointerUp = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        applyButtonTint(state, state.hoverColor);
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
        state.disabledColor = darkenColor(state.baseColor, overrides.disabledBlend).hex;
    }

    if (enabled) {
        button.setInteractive({ useHandCursor: true });
        ensureBackground(button, state);
        applyButtonTint(state, state.baseColor);
        button.setAlpha(state.enabledAlpha);
        button.setY(state.baseY);
    } else {
        ensureBackground(button, state);
        button.disableInteractive();
        applyButtonTint(state, state.disabledColor);
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
