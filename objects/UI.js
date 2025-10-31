import { CONSTANTS } from '../config.js';
import { createBitmapText } from '../utils/BitmapTextLabel.js';
import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

export function setupButtons(scene) {
    // --- Roll button ---
    const rollButton = createBitmapText(scene, 200, CONSTANTS.BUTTONS_Y, "ROLL", {
        fontSize: "40px",
        color: "#1b1300",
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    applyTextButtonStyle(rollButton, {
        baseColor: '#f1c40f',
        textColor: '#1b1300',
        hoverBlend: 0.16,
        pressBlend: 0.3,
        disabledBlend: 0.45,
        enabledAlpha: 1,
        disabledAlpha: 0.45
    });
    setTextButtonEnabled(rollButton, true);

    rollButton.on("pointerdown", () => scene.rollDice());
    scene.rollButton = rollButton;

    // --- Sort button ---
    const sortButton = createBitmapText(scene, 350, CONSTANTS.BUTTONS_Y, "SORT", {
        fontSize: "40px",
        color: "#002f29",
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    applyTextButtonStyle(sortButton, {
        baseColor: '#1abc9c',
        textColor: '#002f29',
        hoverBlend: 0.14,
        pressBlend: 0.28,
        disabledBlend: 0.35,
        enabledAlpha: 1,
        disabledAlpha: 0.45
    });
    setTextButtonEnabled(sortButton, false);
    scene.sortButton = sortButton;
    sortButton.on("pointerdown", () => scene.sortDice());

    // --- Resolve button ---
    const resolveButton = createBitmapText(scene, 535, CONSTANTS.BUTTONS_Y, "RESOLVE", {
        fontSize: "40px",
        color: "#f7ecff",
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    applyTextButtonStyle(resolveButton, {
        baseColor: '#9b59b6',
        textColor: '#f7ecff',
        hoverBlend: 0.14,
        pressBlend: 0.3,
        disabledBlend: 0.38,
        enabledAlpha: 1,
        disabledAlpha: 0.45
    });
    setTextButtonEnabled(resolveButton, true);

    resolveButton.on("pointerdown", () => {
        scene.resolveDice();
    });
    scene.resolveButton = resolveButton;
}

export function setupHealthBar(scene) {
    const barWidth = 200;
    const barHeight = 20;
    const y = 30;

    // Slightly larger background rectangle to act as a border.
    const barBg = scene.add.rectangle(20, y, barWidth + 4, barHeight + 4, 0x000000, 0.6)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xffffff, 0.4);

    const barFill = scene.add.rectangle(22, y + 2, barWidth, barHeight, 0x27ae60)
        .setOrigin(0, 0);

    const damageFill = scene.add.rectangle(22, y + 2, barWidth, barHeight, 0x8b0000)
        .setOrigin(0, 0)
        .setVisible(false);
    damageFill.displayWidth = 0;
    damageFill.displayHeight = barHeight;

    const text = createBitmapText(scene, 20, y + 2 + barHeight + 8, "", {
        fontSize: "20px",
        color: "#ffffff"
    });

    return {
        barWidth,
        barHeight,
        barBg,
        barFill,
        damageFill,
        fillColor: 0x27ae60,
        damageColor: 0x8b0000,
        text
    };
}

export function setupEnemyUI(scene, enemyName) {
    const barWidth = 200;
    const barHeight = 20;
    const x = scene.scale.width - barWidth - 22;
    const y = 30;

    const barBg = scene.add.rectangle(x - 2, y - 2, barWidth + 4, barHeight + 4, 0x000000, 0.6)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xffffff, 0.4);

    const barFill = scene.add.rectangle(x, y, barWidth, barHeight, 0xc0392b)
        .setOrigin(0, 0);

    const damageFill = scene.add.rectangle(x, y, barWidth, barHeight, 0x641e16)
        .setOrigin(0, 0)
        .setVisible(false);
    damageFill.displayWidth = 0;
    damageFill.displayHeight = barHeight;

    const text = createBitmapText(scene, x + barWidth, y + barHeight + 8, "", {
        fontSize: "20px",
        color: "#ffffff"
    }).setOrigin(1, 0);

    const nameText = createBitmapText(scene, x + barWidth, y - 24, enemyName, {
        fontSize: "18px",
        color: "#ffffff"
    }).setOrigin(1, 0);

    const intentText = createBitmapText(scene, scene.scale.width - 20, y + barHeight + 40, "", {
        fontSize: "20px",
        color: "#f1c40f"
    }).setOrigin(1, 0);

    const statusText = createBitmapText(scene, scene.scale.width - 20, y + barHeight + 66, "", {
        fontSize: "16px",
        color: "#ecf0f1",
        align: "right"
    }).setOrigin(1, 0);

    const burnText = createBitmapText(scene, x - 12, y + barHeight + 10, "", {
        fontSize: "16px",
        color: "#ff7675",
        fontStyle: "bold"
    }).setOrigin(1, 0.5);
    burnText.setVisible(false);

    return {
        barWidth,
        barHeight,
        barBg,
        barFill,
        damageFill,
        fillColor: 0xc0392b,
        damageColor: 0x641e16,
        text,
        nameText,
        intentText,
        statusText,
        burnText
    };
}
