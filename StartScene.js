const LETTER_PATTERNS = {
    D: [
        '11110',
        '10001',
        '10001',
        '10001',
        '11110'
    ],
    R: [
        '11110',
        '10001',
        '11110',
        '10100',
        '10010'
    ],
    O: [
        '01110',
        '10001',
        '10001',
        '10001',
        '01110'
    ],
    P: [
        '11110',
        '10001',
        '11110',
        '10000',
        '10000'
    ],
    L: [
        '10000',
        '10000',
        '10000',
        '10000',
        '11111'
    ],
    '+': [
        '00100',
        '00100',
        '11111',
        '00100',
        '00100'
    ]
};

export class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });

        this.dieSize = 22;
        this.dieSpacing = 2;
        this.letterSpacing = 12;
        this.lineSpacing = this.dieSize * 0.8;
        this.titleDice = [];
    }

    preload() {
        this.cameras.main.setBackgroundColor('#1a1a1a');
    }

    create() {
        const { width } = this.scale;
        this.titleDice.length = 0;

        const lines = ['DROP', '+', 'ROLL'];
        const titleY = 120;
        const letterHeight = this.getLetterHeight();

        lines.forEach((line, index) => {
            const lineWidth = this.getWordWidth(line);
            const startX = (width - lineWidth) / 2;
            const lineY = titleY + index * (letterHeight + this.lineSpacing);
            this.createDiceWord(line, startX, lineY);
        });

        const lastLineBottom = titleY + (lines.length - 1) * (letterHeight + this.lineSpacing) + letterHeight;
        const buttonY = lastLineBottom + this.dieSize * 3;

        const button = this.add.text(width / 2, buttonY, 'PLAY', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);

        button.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                button.setScale(1.08);
            })
            .on('pointerout', () => {
                button.setScale(1);
            })
            .on('pointerdown', () => {
                button.disableInteractive();
                this.tweens.add({
                    targets: this.titleDice,
                    alpha: 0,
                    duration: 250,
                    ease: 'Cubic.easeIn'
                });
                this.tweens.add({
                    targets: button,
                    alpha: 0,
                    duration: 250,
                    ease: 'Cubic.easeIn',
                    onComplete: () => {
                        this.scene.start('GameScene');
                    }
                });
            });
    }

    getLetterHeight() {
        const sample = LETTER_PATTERNS.D;
        if (!sample || sample.length === 0) {
            return this.dieSize;
        }

        const rows = sample.length;
        return rows * (this.dieSize + this.dieSpacing) - this.dieSpacing;
    }

    getWordWidth(word) {
        let width = 0;
        for (const char of word) {
            const pattern = LETTER_PATTERNS[char];
            if (!pattern || pattern.length === 0) {
                continue;
            }
            const columns = pattern[0].length;
            width += columns * (this.dieSize + this.dieSpacing);
            width += this.letterSpacing;
        }
        return Math.max(0, width - this.letterSpacing);
    }

    createDiceWord(word, startX, startY) {
        let x = startX;
        for (const char of word) {
            x = this.createDiceLetter(char, x, startY);
        }
        return x;
    }

    createDiceLetter(char, startX, startY) {
        const pattern = LETTER_PATTERNS[char];
        if (!pattern || pattern.length === 0) {
            return startX + this.letterSpacing;
        }

        const columns = pattern[0].length;
        const rows = pattern.length;

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < columns; col += 1) {
                if (pattern[row][col] !== '1') {
                    continue;
                }

                const x = startX + col * (this.dieSize + this.dieSpacing);
                const y = startY + row * (this.dieSize + this.dieSpacing);
                const die = this.createDiceSquare(x, y);
                this.titleDice.push(die);
            }
        }

        return startX + columns * (this.dieSize + this.dieSpacing) + this.letterSpacing;
    }

    createDiceSquare(x, y) {
        const container = this.add.container(x + this.dieSize / 2, y + this.dieSize / 2);
        const outlineColor = 0x111111;
        const backgroundColor = 0xf7f3e9;
        const pipColor = 0x111111;

        const rect = this.add.rectangle(0, 0, this.dieSize, this.dieSize, backgroundColor, 1);
        rect.setStrokeStyle(4, outlineColor, 0.9);
        rect.setOrigin(0.5);
        container.add(rect);

        const pipRadius = this.dieSize * 0.11;
        const offset = this.dieSize * 0.23;
        const pipPositions = {
            center: { x: 0, y: 0 },
            topLeft: { x: -offset, y: -offset },
            topCenter: { x: 0, y: -offset },
            topRight: { x: offset, y: -offset },
            middleLeft: { x: -offset, y: 0 },
            middleRight: { x: offset, y: 0 },
            bottomLeft: { x: -offset, y: offset },
            bottomCenter: { x: 0, y: offset },
            bottomRight: { x: offset, y: offset }
        };

        const pipLayouts = {
            1: ['center'],
            2: ['topLeft', 'bottomRight'],
            3: ['topLeft', 'center', 'bottomRight'],
            4: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
            5: ['topLeft', 'topRight', 'center', 'bottomLeft', 'bottomRight'],
            6: ['topLeft', 'topRight', 'middleLeft', 'middleRight', 'bottomLeft', 'bottomRight']
        };

        const value = Phaser.Math.Between(1, 6);
        const layout = pipLayouts[value] || [];

        layout.forEach((key) => {
            const position = pipPositions[key];
            if (!position) {
                return;
            }
            const pip = this.add.circle(position.x, position.y, pipRadius, pipColor, 1);
            pip.setOrigin(0.5);
            container.add(pip);
        });

        const shadow = this.add.rectangle(6, 8, this.dieSize, this.dieSize, 0x000000, 0.15);
        shadow.setOrigin(0.5);
        shadow.setDepth(-1);
        container.addAt(shadow, 0);

        container.setAlpha(0);
        this.tweens.add({
            targets: container,
            alpha: 1,
            duration: Phaser.Math.Between(750, 1800),
            delay: Phaser.Math.Between(0, 300),
            ease: 'Sine.easeOut'
        });

        return container;
    }
}
