const WHITE = 0xffffff;
const BLACK = 0x000000;

function getButtonPadding(button) {
    if (!button) {
        return { x: 0, y: 0 };
    }

    if (button.__bitmapPadding) {
        return { ...button.__bitmapPadding };
    }

    if (button.padding) {
        if (typeof button.padding === 'number' && Number.isFinite(button.padding)) {
            return { x: Math.max(0, button.padding), y: Math.max(0, button.padding) };
        }

        if (typeof button.padding === 'object') {
            const { x, y, left, right, top, bottom } = button.padding;
            const horizontal = [x, left, right].find((entry) => typeof entry === 'number' && Number.isFinite(entry));
            const vertical = [y, top, bottom].find((entry) => typeof entry === 'number' && Number.isFinite(entry));
            return {
                x: Math.max(0, horizontal || 0),
                y: Math.max(0, vertical || 0)
            };
        }
    }

    return { x: 0, y: 0 };
}

function getButtonDimensions(button, padding) {
    if (!button) {
        return { width: 0, height: 0 };
    }

    const baseWidth = Number.isFinite(button.displayWidth) && button.displayWidth > 0
        ? button.displayWidth
        : button.width || 0;
    const baseHeight = Number.isFinite(button.displayHeight) && button.displayHeight > 0
        ? button.displayHeight
        : button.height || 0;

    const pad = padding || getButtonPadding(button);

    return {
        width: Math.max(0, baseWidth + pad.x * 2),
        height: Math.max(0, baseHeight + pad.y * 2)
    };
}

function ensureButtonHitArea(button, width, height) {
    if (!button || typeof button.setInteractive !== 'function' || typeof Phaser === 'undefined' || !Phaser.Geom) {
        return;
    }

    const originX = typeof button.originX === 'number' ? button.originX : 0;
    const originY = typeof button.originY === 'number' ? button.originY : 0;

    const hitArea = new Phaser.Geom.Rectangle(-width * originX, -height * originY, width, height);
    button.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
}

function syncBackgroundWithButton(button, background) {
    if (!button || !background) {
        return;
    }

    const parentContainer = button.parentContainer || null;
    if (parentContainer && background.parentContainer !== parentContainer && typeof parentContainer.addAt === 'function') {
        const index = typeof parentContainer.getIndex === 'function'
            ? parentContainer.getIndex(button)
            : 0;
        parentContainer.addAt(background, Math.max(0, index));
    } else if (!parentContainer && background.parentContainer && typeof background.parentContainer.remove === 'function') {
        background.parentContainer.remove(background);
        if (background.scene && background.scene.children) {
            background.scene.children.add(background);
        }
    }

    if (typeof background.setPosition === 'function') {
        background.setPosition(button.x, button.y);
    }

    if (typeof background.setDepth === 'function') {
        const depth = typeof button.depth === 'number' ? button.depth : 0;
        background.setDepth(depth - 1);
    }

    if (typeof background.setVisible === 'function') {
        background.setVisible(button.visible);
    }

    if (typeof background.setScrollFactor === 'function' && typeof button.scrollFactorX === 'number' && typeof button.scrollFactorY === 'number') {
        background.setScrollFactor(button.scrollFactorX, button.scrollFactorY);
    }
}

function getWorldAlpha(gameObject) {
    let alpha = typeof gameObject.alpha === 'number' ? gameObject.alpha : 1;
    let current = gameObject.parentContainer;
    while (current) {
        const parentAlpha = typeof current.alpha === 'number' ? current.alpha : 1;
        alpha *= parentAlpha;
        current = current.parentContainer;
    }
    return alpha;
}

function patchButtonSyncMethods(button, state) {
    if (!button || !state || button.__textButtonBackgroundPatched) {
        return;
    }

    button.__textButtonBackgroundPatched = true;
    const scene = button.scene;

    if (typeof button.once === 'function') {
        button.once('destroy', () => {
            if (state.background && state.background.scene) {
                state.background.destroy();
            }
            state.background = null;
            if (scene && scene.events && typeof scene.events.off === 'function') {
                scene.events.off('postupdate', state.__backgroundUpdateHandler);
            }
            state.__backgroundUpdateHandler = null;
        });
    }

    const originalSetPosition = button.setPosition;
    if (typeof originalSetPosition === 'function') {
        button.setPosition = function setPositionWithBackground(x, y, z, w) {
            const result = originalSetPosition.call(this, x, y, z, w);
            syncBackgroundWithButton(this, state.background);
            return result;
        };
    }

    const originalSetX = button.setX;
    if (typeof originalSetX === 'function') {
        button.setX = function setXWithBackground(x) {
            const result = originalSetX.call(this, x);
            syncBackgroundWithButton(this, state.background);
            return result;
        };
    }

    const originalSetY = button.setY;
    if (typeof originalSetY === 'function') {
        button.setY = function setYWithBackground(y) {
            const result = originalSetY.call(this, y);
            syncBackgroundWithButton(this, state.background);
            return result;
        };
    }

    const originalSetDepth = button.setDepth;
    if (typeof originalSetDepth === 'function') {
        button.setDepth = function setDepthWithBackground(depth) {
            const result = originalSetDepth.call(this, depth);
            syncBackgroundWithButton(this, state.background);
            return result;
        };
    }

    const originalSetVisible = button.setVisible;
    if (typeof originalSetVisible === 'function') {
        button.setVisible = function setVisibleWithBackground(visible) {
            const result = originalSetVisible.call(this, visible);
            if (state.background && typeof state.background.setVisible === 'function') {
                state.background.setVisible(visible);
            }
            return result;
        };
    }

    const originalSetText = button.setText;
    if (typeof originalSetText === 'function') {
        button.setText = function setTextWithBackground(...args) {
            const result = originalSetText.apply(this, args);
            ensureTextButtonBackground(this, state, {
                backgroundAlpha: state.backgroundAlpha,
                enabledAlpha: state.enabledAlpha
            });
            const isEnabled = !this.input || this.input.enabled;
            applyBackgroundStyle(this, state, isEnabled ? state.baseBackgroundColor : state.disabledBackgroundColor, isEnabled ? state.enabledAlpha : state.disabledAlpha);
            return result;
        };
    }

    if (scene && scene.events && typeof scene.events.on === 'function' && !state.__backgroundUpdateHandler) {
        state.__backgroundUpdateHandler = () => {
            if (!state.background || !state.background.scene) {
                return;
            }
            syncBackgroundWithButton(button, state.background);

            const buttonAlpha = typeof button.alpha === 'number' ? button.alpha : 1;
            const worldAlpha = getWorldAlpha(button);
            const baseAlpha = typeof state.currentAlpha === 'number' ? state.currentAlpha : buttonAlpha;
            const combinedAlpha = buttonAlpha > 0 ? (worldAlpha / buttonAlpha) * baseAlpha : worldAlpha * baseAlpha;
            state.background.setAlpha(combinedAlpha);
        };
        scene.events.on('postupdate', state.__backgroundUpdateHandler);
    }
}

function ensureTextButtonBackground(button, state, { backgroundAlpha, enabledAlpha }) {
    if (!button || !button.scene || !state) {
        return null;
    }

    const padding = getButtonPadding(button);
    const { width, height } = getButtonDimensions(button, padding);
    const effectiveWidth = Math.max(1, width);
    const effectiveHeight = Math.max(1, height);

    let background = state.background;
    if (!background || !background.scene) {
        background = button.scene.add.rectangle(button.x, button.y, effectiveWidth, effectiveHeight, state.baseBackgroundColor, backgroundAlpha);
        const originX = typeof button.originX === 'number' ? button.originX : 0;
        const originY = typeof button.originY === 'number' ? button.originY : 0;
        background.setOrigin(originX, originY);
        background.setDepth((typeof button.depth === 'number' ? button.depth : 0) - 1);
        background.setScrollFactor(button.scrollFactorX ?? 1, button.scrollFactorY ?? 1);
        background.setVisible(button.visible);
        background.setAlpha(enabledAlpha);
        state.background = background;
    } else {
        background.setSize(effectiveWidth, effectiveHeight);
        background.setDisplaySize(effectiveWidth, effectiveHeight);
        background.setAlpha(enabledAlpha);
    }

    ensureButtonHitArea(button, effectiveWidth, effectiveHeight);
    syncBackgroundWithButton(button, background);
    patchButtonSyncMethods(button, state);

    return background;
}

function applyBackgroundStyle(button, state, color, alpha) {
    if (!state || !state.background) {
        return;
    }

    state.background.setFillStyle(color, state.backgroundAlpha);
    state.currentAlpha = alpha;
    state.background.setAlpha(alpha);
    syncBackgroundWithButton(button, state.background);
}

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
    pressOffset = 2,
    backgroundAlpha = 1
} = {}) {
    if (!button) {
        return;
    }

    const resolvedTextColor = textColor || '#ffffff';
    const baseTint = toInt(getColorObject(resolvedTextColor));
    const hoverTint = lightenColor(resolvedTextColor, hoverBlend).int;
    const pressedTint = darkenColor(resolvedTextColor, pressBlend).int;
    const disabledTint = darkenColor(resolvedTextColor, disabledBlend).int;

    const baseBackgroundColor = toInt(getColorObject(baseColor));
    const hoverBackgroundColor = lightenColor(baseColor, hoverBlend).int;
    const pressedBackgroundColor = darkenColor(baseColor, pressBlend).int;
    const disabledBackgroundColor = darkenColor(baseColor, disabledBlend).int;

    const clampedBackgroundAlpha = Phaser.Math.Clamp(backgroundAlpha, 0, 1);

    const state = {
        baseTint,
        hoverTint,
        pressedTint,
        disabledTint,
        baseBackgroundColor,
        hoverBackgroundColor,
        pressedBackgroundColor,
        disabledBackgroundColor,
        enabledAlpha,
        disabledAlpha,
        baseY: button.y,
        pressOffset,
        backgroundAlpha: clampedBackgroundAlpha,
        background: null
    };

    button.setDataEnabled();
    button.setData('textButtonStyle', state);

    ensureTextButtonBackground(button, state, {
        backgroundAlpha: clampedBackgroundAlpha,
        enabledAlpha
    });

    button.setTint(baseTint);
    button.setAlpha(enabledAlpha);
    applyBackgroundStyle(button, state, baseBackgroundColor, enabledAlpha);

    const handlePointerOver = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.hoverTint);
        button.setAlpha(state.enabledAlpha);
        applyBackgroundStyle(button, state, state.hoverBackgroundColor, state.enabledAlpha);
    };

    const restoreIdleState = () => {
        const isEnabled = button.input && button.input.enabled;
        button.setTint(isEnabled ? state.baseTint : state.disabledTint);
        button.setAlpha(isEnabled ? state.enabledAlpha : state.disabledAlpha);
        button.setY(state.baseY);
        applyBackgroundStyle(button, state, isEnabled ? state.baseBackgroundColor : state.disabledBackgroundColor, isEnabled ? state.enabledAlpha : state.disabledAlpha);
    };

    const handlePointerDown = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.pressedTint);
        button.setY(state.baseY + state.pressOffset);
        applyBackgroundStyle(button, state, state.pressedBackgroundColor, state.enabledAlpha);
    };

    const handlePointerUp = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.hoverTint);
        button.setAlpha(state.enabledAlpha);
        button.setY(state.baseY);
        applyBackgroundStyle(button, state, state.hoverBackgroundColor, state.enabledAlpha);
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
        state.disabledBackgroundColor = darkenColor(state.baseBackgroundColor, overrides.disabledBlend).int;
    }

    ensureTextButtonBackground(button, state, {
        backgroundAlpha: state.backgroundAlpha,
        enabledAlpha: enabled ? state.enabledAlpha : state.disabledAlpha
    });

    if (enabled) {
        button.setInteractive({ useHandCursor: true });
        button.setTint(state.baseTint);
        button.setAlpha(state.enabledAlpha);
        button.setY(state.baseY);
        applyBackgroundStyle(button, state, state.baseBackgroundColor, state.enabledAlpha);
    } else {
        button.disableInteractive();
        button.setTint(state.disabledTint);
        button.setAlpha(state.disabledAlpha);
        button.setY(state.baseY);
        applyBackgroundStyle(button, state, state.disabledBackgroundColor, state.disabledAlpha);
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
