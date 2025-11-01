import { CONSTANTS } from '../config.js';
import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

function createBattleButton(scene, { x, label, textColor, styles, enabled, onClick }) {
    const button = scene.add
        .text(x, CONSTANTS.BUTTONS_Y, label, {
            fontSize: '40px',
            color: textColor,
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5);

    applyTextButtonStyle(button, styles);
    setTextButtonEnabled(button, enabled);
    button.on('pointerdown', onClick);

    return button;
}

function getStyledButtonWidth(button) {
    if (!button) {
        return 0;
    }

    const styleState = button.getData('textButtonStyle');
    if (styleState && styleState.backgroundRect) {
        return styleState.backgroundRect.displayWidth || styleState.backgroundRect.width || 0;
    }

    return button.displayWidth || button.width || 0;
}

export function setupButtons(scene) {
    const buttonDefinitions = [
        {
            key: 'rollButton',
            label: 'ROLL',
            textColor: '#1b1300',
            styles: {
                baseColor: '#f1c40f',
                textColor: '#1b1300',
                hoverBlend: 0.16,
                pressBlend: 0.3,
                disabledBlend: 0.45,
                enabledAlpha: 1,
                disabledAlpha: 0.45,
                background: {
                    paddingX: 56,
                    paddingY: 28,
                    strokeColor: '#1b1300',
                    strokeAlpha: 0.4,
                    strokeWidth: 4
                }
            },
            enabled: true,
            onClick: () => scene.rollDice()
        },
        {
            key: 'sortButton',
            label: 'SORT',
            textColor: '#002f29',
            styles: {
                baseColor: '#1abc9c',
                textColor: '#002f29',
                hoverBlend: 0.14,
                pressBlend: 0.28,
                disabledBlend: 0.35,
                enabledAlpha: 1,
                disabledAlpha: 0.45,
                background: {
                    paddingX: 56,
                    paddingY: 28,
                    strokeColor: '#002f29',
                    strokeAlpha: 0.45,
                    strokeWidth: 4
                }
            },
            enabled: false,
            onClick: () => scene.sortDice()
        },
        {
            key: 'resolveButton',
            label: 'RESOLVE',
            textColor: '#f7ecff',
            styles: {
                baseColor: '#9b59b6',
                textColor: '#f7ecff',
                hoverBlend: 0.14,
                pressBlend: 0.3,
                disabledBlend: 0.38,
                enabledAlpha: 1,
                disabledAlpha: 0.45,
                background: {
                    paddingX: 64,
                    paddingY: 28,
                    strokeColor: '#4a235a',
                    strokeAlpha: 0.5,
                    strokeWidth: 4
                }
            },
            enabled: true,
            onClick: () => scene.resolveDice()
        }
    ];

    const buttons = buttonDefinitions.reduce((acc, definition, index) => {
        const button = createBattleButton(scene, {
            x: 200 + index * 230,
            label: definition.label,
            textColor: definition.textColor,
            styles: definition.styles,
            enabled: definition.enabled,
            onClick: definition.onClick
        });

        scene[definition.key] = button;
        acc[definition.key] = button;
        return acc;
    }, {});

    const layoutBattleButtons = () => {
        const spacing = 20;
        const rollCount = scene.rollsRemainingText;

        const rollCountRight = rollCount
            ? rollCount.x + (rollCount.displayWidth || rollCount.width || 0) / 2
            : 200;

        let currentX = rollCountRight + spacing;

        [
            buttons.rollButton,
            buttons.sortButton,
            buttons.resolveButton
        ].forEach(button => {
            if (!button) {
                return;
            }

            const width = getStyledButtonWidth(button);
            const halfWidth = width / 2;

            button.setX(currentX + halfWidth);
            currentX += width + spacing;
        });
    };

    scene.layoutBattleButtons = layoutBattleButtons;
    layoutBattleButtons();
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
        fontSize: "32px",
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
        fontSize: "32px",
        color: "#ffffff"
    }).setOrigin(1, 0);

    const nameText = scene.add.text(x + barWidth, y - 32, enemyName, {
        fontSize: "32px",
        color: "#ffffff"
    }).setOrigin(1, 0);

    const intentText = scene.add.text(scene.scale.width - 20, y + barHeight + 40, "", {
        fontSize: "32px",
        color: "#f1c40f"
    }).setOrigin(1, 0);

    const statusText = scene.add.text(scene.scale.width - 20, y + barHeight + 66, "", {
        fontSize: "32px",
        color: "#ecf0f1",
        align: "right"
    }).setOrigin(1, 0);

    const burnText = scene.add.text(x - 12, y + barHeight + 10, "", {
        fontSize: "32px",
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
