import { CONSTANTS } from '../config.js';

export function setupButtons(scene) {
    // --- Roll button ---
    const rollButton = scene.add.text(200, CONSTANTS.BUTTONS_Y, "ROLL", {
        fontSize: "40px",
        color: "#000",
        backgroundColor: "#f1c40f",
        padding: {x:20, y:10}
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    rollButton.on("pointerdown", () => scene.rollDice());
    scene.rollButton = rollButton;

    // --- Sort button ---
    const sortButton = scene.add.text(350, CONSTANTS.BUTTONS_Y, "SORT", {
        fontSize: "40px",
        color: "#000",
        backgroundColor: "#1abc9c",
        padding: {x:20, y:10}
    }).setOrigin(0.5);
    
    sortButton.setAlpha(0.5);
    sortButton.disableInteractive();
    scene.sortButton = sortButton;
    sortButton.on("pointerdown", () => scene.sortDice());

    // --- Resolve button ---
    const resolveButton = scene.add.text(535, CONSTANTS.BUTTONS_Y, "RESOLVE", {
        fontSize: "40px",
        color: "#fff",
        backgroundColor: "#9b59b6",
        padding: {x:20, y:10}
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resolveButton.on("pointerdown", () => {
        scene.resolveDice();
    });
    scene.resolveButton = resolveButton;
}

export function setupMuteButton(scene, onToggle) {
    const button = scene.add.text(CONSTANTS.UI_MARGIN, scene.scale.height - CONSTANTS.UI_MARGIN, '', {
        fontSize: '28px',
        padding: { x: 16, y: 10 }
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
        if (typeof onToggle === 'function') {
            onToggle();
        }
    });

    return button;
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

    const text = scene.add.text(20, y + 2 + barHeight + 8, "", {
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

    const text = scene.add.text(x + barWidth, y + barHeight + 8, "", {
        fontSize: "20px",
        color: "#ffffff"
    }).setOrigin(1, 0);

    const nameText = scene.add.text(x + barWidth, y - 24, enemyName, {
        fontSize: "18px",
        color: "#ffffff"
    }).setOrigin(1, 0);

    const intentText = scene.add.text(scene.scale.width - 20, y + barHeight + 40, "", {
        fontSize: "20px",
        color: "#f1c40f"
    }).setOrigin(1, 0);

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
        intentText
    };
}
