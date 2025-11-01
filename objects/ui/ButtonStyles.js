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
    pressOffset = 2,
    background
} = {}) {
    if (!button) {
        return;
    }

    const baseTextColor = textColor || baseColor || '#ffffff';
    const baseTint = toInt(getColorObject(baseTextColor));
    const hoverTint = lightenColor(baseTextColor, hoverBlend).int;
    const pressedTint = darkenColor(baseTextColor, pressBlend).int;
    const disabledTint = darkenColor(baseTextColor, disabledBlend).int;

    let backgroundRect = null;
    let backgroundState = null;

    if (background && button.scene && button.scene.add && typeof button.scene.add.rectangle === 'function') {
        const paddingX = typeof background.paddingX === 'number' ? background.paddingX : 32;
        const paddingY = typeof background.paddingY === 'number' ? background.paddingY : 20;
        const backgroundBaseColor = background.baseColor !== undefined ? background.baseColor : baseColor;
        const backgroundBaseAlpha = typeof background.baseAlpha === 'number' ? background.baseAlpha : 1;
        const strokeColor = background.strokeColor;
        const strokeAlpha = typeof background.strokeAlpha === 'number' ? background.strokeAlpha : 0.9;
        const strokeWidth = typeof background.strokeWidth === 'number' ? background.strokeWidth : 2;

        const computeDimensions = () => {
            const width = (button.displayWidth || button.width || 0) + paddingX;
            const height = (button.displayHeight || button.height || 0) + paddingY;
            return {
                width: Math.max(1, width),
                height: Math.max(1, height)
            };
        };

        const { width, height } = computeDimensions();
        const baseColorObj = getColorObject(backgroundBaseColor);
        const baseColorInt = toInt(baseColorObj);
        const hoverColorInt = lightenColor(backgroundBaseColor, hoverBlend).int;
        const pressedColorInt = darkenColor(backgroundBaseColor, pressBlend).int;
        const disabledColorInt = darkenColor(backgroundBaseColor, disabledBlend).int;

        backgroundRect = button.scene.add.rectangle(button.x, button.y, width, height, baseColorInt, backgroundBaseAlpha)
            .setOrigin(button.originX ?? 0.5, button.originY ?? 0.5);

        if (strokeColor !== undefined && strokeColor !== null) {
            backgroundRect.setStrokeStyle(strokeWidth, toInt(getColorObject(strokeColor)), strokeAlpha);
        }

        backgroundRect.setDepth((typeof button.depth === 'number' ? button.depth : 0) - 1);

        backgroundRect.setInteractive({ useHandCursor: true });
        backgroundRect.on('pointerover', pointer => {
            if (backgroundRect.input && backgroundRect.input.enabled) {
                button.emit('pointerover', pointer);
            }
        });
        backgroundRect.on('pointerout', pointer => {
            button.emit('pointerout', pointer);
        });
        backgroundRect.on('pointerdown', pointer => {
            if (backgroundRect.input && backgroundRect.input.enabled) {
                button.emit('pointerdown', pointer);
            }
        });
        backgroundRect.on('pointerup', pointer => {
            button.emit('pointerup', pointer);
        });
        backgroundRect.on('pointerupoutside', pointer => {
            button.emit('pointerupoutside', pointer);
        });

        const syncSize = () => {
            const dims = computeDimensions();
            backgroundRect.setSize(dims.width, dims.height);
            if (typeof backgroundRect.setDisplaySize === 'function') {
                backgroundRect.setDisplaySize(dims.width, dims.height);
            }
        };

        const updateTransform = () => {
            if (!backgroundRect || !backgroundRect.scene || !button.scene) {
                return;
            }

            if (typeof button.getWorldTransformMatrix === 'function') {
                const matrix = button.getWorldTransformMatrix();
                backgroundRect.setPosition(matrix.tx, matrix.ty);
            } else {
                backgroundRect.setPosition(button.x, button.y);
            }

            const parent = button.parentContainer;
            if (parent && typeof parent.getIndex === 'function') {
                const buttonIndex = parent.getIndex(button);
                const desiredIndex = buttonIndex >= 0 ? buttonIndex : parent.length;
                if (backgroundRect.parentContainer !== parent) {
                    parent.addAt(backgroundRect, desiredIndex);
                } else if (typeof parent.moveTo === 'function') {
                    const currentIndex = parent.getIndex(backgroundRect);
                    if (currentIndex !== desiredIndex) {
                        parent.moveTo(backgroundRect, desiredIndex);
                    }
                }
            } else if (!parent && backgroundRect.parentContainer) {
                const formerParent = backgroundRect.parentContainer;
                if (typeof formerParent.remove === 'function') {
                    formerParent.remove(backgroundRect, false);
                }
                if (button.scene && button.scene.children && typeof button.scene.children.add === 'function') {
                    button.scene.children.add(backgroundRect);
                }
            }
        };

        updateTransform();

        const sceneEvents = button.scene && button.scene.events;
        if (sceneEvents && typeof sceneEvents.on === 'function') {
            sceneEvents.on('postupdate', updateTransform);
        }

        if (typeof button.scrollFactorX === 'number' || typeof button.scrollFactorY === 'number') {
            const scrollFactorX = typeof button.scrollFactorX === 'number' ? button.scrollFactorX : 1;
            const scrollFactorY = typeof button.scrollFactorY === 'number' ? button.scrollFactorY : 1;
            if (typeof backgroundRect.setScrollFactor === 'function') {
                backgroundRect.setScrollFactor(scrollFactorX, scrollFactorY);
            }
        }

        const originalSetText = typeof button.setText === 'function' ? button.setText.bind(button) : null;
        if (originalSetText) {
            button.setText = function patchedSetText(...args) {
                const result = originalSetText(...args);
                syncSize();
                updateTransform();
                return result;
            };
        }

        const originalSetPosition = typeof button.setPosition === 'function' ? button.setPosition.bind(button) : null;
        if (originalSetPosition) {
            button.setPosition = function patchedSetPosition(x, y, z, w) {
                const result = originalSetPosition(x, y, z, w);
                updateTransform();
                return result;
            };
        }

        const originalSetOrigin = typeof button.setOrigin === 'function' ? button.setOrigin.bind(button) : null;
        if (originalSetOrigin) {
            button.setOrigin = function patchedSetOrigin(x, y) {
                const result = originalSetOrigin(x, y);
                backgroundRect.setOrigin(button.originX, button.originY);
                updateTransform();
                return result;
            };
        }

        const originalSetDepth = typeof button.setDepth === 'function' ? button.setDepth.bind(button) : null;
        if (originalSetDepth) {
            button.setDepth = function patchedSetDepth(depth) {
                const result = originalSetDepth(depth);
                backgroundRect.setDepth(depth - 1);
                return result;
            };
        }

        const originalSetVisible = typeof button.setVisible === 'function' ? button.setVisible.bind(button) : null;
        if (originalSetVisible) {
            button.setVisible = function patchedSetVisible(visible) {
                const result = originalSetVisible(visible);
                backgroundRect.setVisible(visible);
                return result;
            };
        }

        const originalSetScrollFactor = typeof button.setScrollFactor === 'function' ? button.setScrollFactor.bind(button) : null;
        if (originalSetScrollFactor) {
            button.setScrollFactor = function patchedSetScrollFactor(x, y) {
                const result = originalSetScrollFactor(x, y);
                if (typeof backgroundRect.setScrollFactor === 'function') {
                    const scrollX = typeof button.scrollFactorX === 'number' ? button.scrollFactorX : x;
                    const scrollY = typeof button.scrollFactorY === 'number' ? button.scrollFactorY : y;
                    backgroundRect.setScrollFactor(
                        typeof scrollX === 'number' ? scrollX : 1,
                        typeof scrollY === 'number' ? scrollY : 1
                    );
                }
                return result;
            };
        }

        const originalDestroy = typeof button.destroy === 'function' ? button.destroy.bind(button) : null;
        if (originalDestroy) {
            button.destroy = function patchedDestroy(fromScene) {
                if (sceneEvents && typeof sceneEvents.off === 'function') {
                    sceneEvents.off('postupdate', updateTransform);
                }
                if (backgroundRect && backgroundRect.scene) {
                    backgroundRect.destroy(fromScene);
                }
                return originalDestroy(fromScene);
            };
        }

        backgroundState = {
            paddingX,
            paddingY,
            baseColor: baseColorInt,
            hoverColor: hoverColorInt,
            pressedColor: pressedColorInt,
            disabledColor: disabledColorInt,
            baseAlpha: backgroundBaseAlpha
        };

        syncSize();
        updateTransform();
    }

    const state = {
        baseTint,
        hoverTint,
        pressedTint,
        disabledTint,
        enabledAlpha,
        disabledAlpha,
        baseY: button.y,
        pressOffset,
        backgroundRect,
        backgroundState
    };

    button.setDataEnabled();
    button.setData('textButtonStyle', state);

    button.setTint(baseTint);
    button.setAlpha(enabledAlpha);
    if (backgroundRect && backgroundRect.active && backgroundState) {
        backgroundRect.setFillStyle(backgroundState.baseColor, backgroundState.baseAlpha);
        backgroundRect.setAlpha(enabledAlpha);
    }

    const handlePointerOver = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.hoverTint);
        button.setAlpha(state.enabledAlpha);
        if (state.backgroundRect && state.backgroundRect.active && state.backgroundState) {
            state.backgroundRect.setFillStyle(state.backgroundState.hoverColor, state.backgroundState.baseAlpha);
            state.backgroundRect.setAlpha(state.enabledAlpha);
        }
    };

    const restoreIdleState = () => {
        const isEnabled = button.input && button.input.enabled;
        button.setTint(isEnabled ? state.baseTint : state.disabledTint);
        button.setAlpha(isEnabled ? state.enabledAlpha : state.disabledAlpha);
        button.setY(state.baseY);
        if (state.backgroundRect && state.backgroundRect.active && state.backgroundState) {
            const color = isEnabled ? state.backgroundState.baseColor : state.backgroundState.disabledColor;
            const alpha = isEnabled ? state.enabledAlpha : state.disabledAlpha;
            state.backgroundRect.setFillStyle(color, state.backgroundState.baseAlpha);
            state.backgroundRect.setAlpha(alpha);
        }
    };

    const handlePointerDown = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.pressedTint);
        button.setY(state.baseY + state.pressOffset);
        if (state.backgroundRect && state.backgroundRect.active && state.backgroundState) {
            state.backgroundRect.setFillStyle(state.backgroundState.pressedColor, state.backgroundState.baseAlpha);
        }
    };

    const handlePointerUp = () => {
        if (!button.input || !button.input.enabled) {
            return;
        }
        button.setTint(state.hoverTint);
        button.setAlpha(state.enabledAlpha);
        button.setY(state.baseY);
        if (state.backgroundRect && state.backgroundRect.active && state.backgroundState) {
            state.backgroundRect.setFillStyle(state.backgroundState.hoverColor, state.backgroundState.baseAlpha);
            state.backgroundRect.setAlpha(state.enabledAlpha);
        }
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
        if (state.backgroundState) {
            state.backgroundState.disabledColor = darkenColor(state.backgroundState.baseColor, overrides.disabledBlend).int;
        }
    }

    if (enabled) {
        button.setInteractive({ useHandCursor: true });
        button.setTint(state.baseTint);
        button.setAlpha(state.enabledAlpha);
        button.setY(state.baseY);
        if (state.backgroundRect) {
            state.backgroundRect.setInteractive({ useHandCursor: true });
            const color = state.backgroundState ? state.backgroundState.baseColor : state.baseTint;
            const alpha = state.backgroundState ? state.backgroundState.baseAlpha : 1;
            state.backgroundRect.setFillStyle(color, alpha);
            state.backgroundRect.setAlpha(state.enabledAlpha);
        }
    } else {
        button.disableInteractive();
        button.setTint(state.disabledTint);
        button.setAlpha(state.disabledAlpha);
        button.setY(state.baseY);
        if (state.backgroundRect) {
            state.backgroundRect.disableInteractive();
            const color = state.backgroundState ? state.backgroundState.disabledColor : state.disabledTint;
            const alpha = state.backgroundState ? state.backgroundState.baseAlpha : 1;
            state.backgroundRect.setFillStyle(color, alpha);
            state.backgroundRect.setAlpha(state.disabledAlpha);
        }
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
