import { createBitmapText } from '../../utils/BitmapTextLabel.js';

const BASE_SIZE = 60;
const BASE_PIP_RADIUS = 6;
const BASE_POSITIONS = {
    1: [[0, 0]],
    2: [[-15, -15], [15, 15]],
    3: [[-15, -15], [0, 0], [15, 15]],
    4: [[-15, -15], [15, -15], [-15, 15], [15, 15]],
    5: [[-15, -15], [15, -15], [0, 0], [-15, 15], [15, 15]],
    6: [[-15, -15], [15, -15], [-15, 0], [15, 0], [-15, 15], [15, 15]]
};

function createQuestionText(scene, size, style = {}) {
    const fontSize = style.fontSize || `${Math.round(size * 0.6)}px`;
    const color = style.color || '#ffffff';
    const fontStyle = style.fontStyle || 'bold';
    return createBitmapText(scene, 0, 0, '?', {
        fontSize,
        color,
        fontStyle,
        ...style
    }).setOrigin(0.5);
}

export function createDieFace(scene, {
    size = BASE_SIZE,
    backgroundColor = 0x444444,
    backgroundAlpha = 1,
    strokeColor = 0xffffff,
    strokeWidth = 3,
    strokeAlpha = 0.35,
    pipColor = 0xffffff,
    questionMarkStyle
} = {}) {
    const container = scene.add.container(0, 0);
    const background = scene.add.rectangle(0, 0, size, size, backgroundColor, backgroundAlpha)
        .setOrigin(0.5)
        .setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);

    const pipLayer = scene.add.container(0, 0);
    const questionMark = createQuestionText(scene, size, questionMarkStyle);

    container.add([background, pipLayer, questionMark]);

    let pipSprites = [];
    let currentValue = null;

    function clearPips() {
        pipSprites.forEach(pip => pip.destroy());
        pipSprites = [];
    }

    function showUnknown() {
        clearPips();
        currentValue = null;
        questionMark.setVisible(true);
    }

    function setValue(value, { pipColor: overrideColor } = {}) {
        clearPips();
        currentValue = value;
        if (value == null) {
            questionMark.setVisible(true);
            return;
        }

        const positions = BASE_POSITIONS[value] || [];
        const scale = size / BASE_SIZE;
        const radius = BASE_PIP_RADIUS * scale;
        const color = typeof overrideColor === 'number' ? overrideColor : pipColor;

        positions.forEach(([dx, dy]) => {
            const pip = scene.add.circle(dx * scale, dy * scale, radius, color);
            pipLayer.add(pip);
            pipSprites.push(pip);
        });

        questionMark.setVisible(false);
    }

    function destroy() {
        clearPips();
        questionMark.destroy();
        pipLayer.destroy();
        background.destroy();
        container.destroy();
    }

    return {
        container,
        background,
        get value() {
            return currentValue;
        },
        setValue,
        showUnknown,
        destroy
    };
}

export function setDieBackgroundFill(dieFace, color, alpha = 1) {
    if (dieFace && dieFace.background) {
        dieFace.background.setFillStyle(color, alpha);
    }
}

export function setDieStroke(dieFace, width, color, alpha = 1) {
    if (dieFace && dieFace.background) {
        dieFace.background.setStrokeStyle(width, color, alpha);
    }
}
