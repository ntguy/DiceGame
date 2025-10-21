const HEADER_HEIGHT = 40;

const LETTER_PATTERNS = {
    D: [
        'XXXX.',
        'X...X',
        'X...X',
        'X...X',
        'XXXX.'
    ],
    R: [
        'XXXX.',
        'X...X',
        'XXXX.',
        'X..X.',
        'X...X'
    ],
    O: [
        '.XXX.',
        'X...X',
        'X...X',
        'X...X',
        '.XXX.'
    ],
    P: [
        'XXXX.',
        'X...X',
        'XXXX.',
        'X....',
        'X....'
    ],
    L: [
        'X....',
        'X....',
        'X....',
        'X....',
        'XXXX.'
    ],
    '+': [
        '..X..',
        '..X..',
        'XXXXX',
        '..X..',
        '..X..'
    ]
};

function getLetterDimensions(pattern, dieSize, dieGap) {
    const rows = pattern.length;
    const cols = pattern[0]?.length ?? 0;
    const width = cols > 0 ? (cols - 1) * (dieSize + dieGap) + dieSize : 0;
    const height = rows > 0 ? (rows - 1) * (dieSize + dieGap) + dieSize : 0;

    return { width, height, rows, cols };
}

function getPipOffsets(value, dieSize) {
    const offset = dieSize * 0.25;
    switch (value) {
        case 1:
            return [[0, 0]];
        case 2:
            return [[-offset, -offset], [offset, offset]];
        case 3:
            return [[-offset, -offset], [0, 0], [offset, offset]];
        case 4:
            return [[-offset, -offset], [-offset, offset], [offset, -offset], [offset, offset]];
        case 5:
            return [[-offset, -offset], [-offset, offset], [0, 0], [offset, -offset], [offset, offset]];
        case 6:
        default:
            return [[-offset, -offset], [-offset, 0], [-offset, offset], [offset, -offset], [offset, 0], [offset, offset]];
    }
}

function createDie(scene, x, y, dieSize) {
    const dieContainer = scene.add.container(x, y);
    const borderThickness = Math.max(2, Math.floor(dieSize * 0.08));
    const face = scene.add.rectangle(0, 0, dieSize, dieSize, 0xf7f3e9)
        .setStrokeStyle(borderThickness, 0x222222)
        .setOrigin(0.5);

    dieContainer.add(face);

    const value = Phaser.Math.Between(1, 6);
    const pipRadius = dieSize * 0.12;
    const pipOffsets = getPipOffsets(value, dieSize);

    pipOffsets.forEach(([offsetX, offsetY]) => {
        const pip = scene.add.circle(offsetX, offsetY, pipRadius, 0x1b1b1b);
        dieContainer.add(pip);
    });

    return dieContainer;
}

function createLetter(scene, pattern, centerX, dieSize, dieGap, centerY) {
    const letterContainer = scene.add.container(centerX, centerY);
    const { rows, cols, width, height } = getLetterDimensions(pattern, dieSize, dieGap);

    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            if (pattern[row][col] !== 'X') {
                continue;
            }

            const x = col * (dieSize + dieGap) - width / 2;
            const y = row * (dieSize + dieGap) - height / 2;
            const die = createDie(scene, x, y, dieSize);
            letterContainer.add(die);
        }
    }

    return letterContainer;
}

function buildTitle(scene) {
    const dieSize = 52;
    const dieGap = 8;
    const letterSpacing = dieSize * 0.6;
    const wordSpacing = dieSize * 2.2;
    const titleParts = ['DROP', '+', 'ROLL'];

    let totalWidth = 0;
    titleParts.forEach((part, partIndex) => {
        for (let i = 0; i < part.length; i += 1) {
            const char = part[i];
            const pattern = LETTER_PATTERNS[char];
            if (!pattern) {
                continue;
            }
            const { width } = getLetterDimensions(pattern, dieSize, dieGap);
            totalWidth += width;
            if (i < part.length - 1) {
                totalWidth += letterSpacing;
            }
        }

        if (partIndex < titleParts.length - 1) {
            totalWidth += wordSpacing;
        }
    });

    const titleContainer = scene.add.container(scene.scale.width / 2, HEADER_HEIGHT + (scene.scale.height - HEADER_HEIGHT) * 0.25);
    let currentX = -totalWidth / 2;

    titleParts.forEach((part, partIndex) => {
        for (let i = 0; i < part.length; i += 1) {
            const char = part[i];
            const pattern = LETTER_PATTERNS[char];
            if (!pattern) {
                continue;
            }

            const { width } = getLetterDimensions(pattern, dieSize, dieGap);
            const letter = createLetter(scene, pattern, currentX + width / 2, dieSize, dieGap, 0);
            titleContainer.add(letter);
            currentX += width;

            if (i < part.length - 1) {
                currentX += letterSpacing;
            }
        }

        if (partIndex < titleParts.length - 1) {
            currentX += wordSpacing;
        }
    });

    return titleContainer;
}

export class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#1b1b1d');

        const title = buildTitle(this);
        title.setScale(0.95);

        const subtitle = this.add.text(this.scale.width / 2, title.y + 180, 'DROP + ROLL', {
            fontFamily: 'Arial Black',
            fontSize: '36px',
            color: '#f2f2f2'
        }).setOrigin(0.5);

        this.createPlayButton(subtitle.y + 140);
    }

    createPlayButton(centerY) {
        const buttonWidth = 280;
        const buttonHeight = 80;
        const button = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x3b8beb)
            .setStrokeStyle(4, 0xffffff)
            .setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(0, 0, 'PLAY', {
            fontFamily: 'Arial Black',
            fontSize: '36px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.container(this.scale.width / 2, centerY, [button, buttonText]);

        button.on('pointerover', () => {
            button.setFillStyle(0x62aefc);
        });

        button.on('pointerout', () => {
            button.setFillStyle(0x3b8beb);
        });

        button.on('pointerdown', () => {
            if (this.sound) {
                this.sound.play('button_click', { volume: 0.3 });
            }
            this.scene.start('GameScene');
        });

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('GameScene');
        });

        this.input.keyboard.once('keydown-ENTER', () => {
            this.scene.start('GameScene');
        });
    }

    preload() {
        this.load.audio('button_click', 'audio/chime-short.mp3');
    }
}
