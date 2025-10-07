import { CONSTANTS } from '../config.js';

export function setupButtons(scene) {
    // --- Roll button ---
    const rollButton = scene.add.text(200, CONSTANTS.BUTTONS_Y, "ROLL", { 
        fontSize: "40px", 
        color: "#000", 
        backgroundColor: "#f1c40f", 
        padding: {x:20, y:10} 
    }).setOrigin(0.5).setInteractive();
    
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
    }).setOrigin(0.5).setInteractive();

    resolveButton.on("pointerdown", () => {
        scene.resolveDice();
    });
}

export function setupHealthBar(scene) {
    const barWidth = 200;
    const barHeight = 20;

    // Slightly larger background rectangle to act as a border.
    const barBg = scene.add.rectangle(20, 20, barWidth + 4, barHeight + 4, 0x000000, 0.6)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xffffff, 0.4);

    const barFill = scene.add.rectangle(22, 22, barWidth, barHeight, 0x27ae60)
        .setOrigin(0, 0);

    const text = scene.add.text(20, 22 + barHeight + 8, "", {
        fontSize: "20px",
        color: "#ffffff"
    });

    return {
        barWidth,
        barHeight,
        barBg,
        barFill,
        text
    };
}
