const LETTER_PATTERNS = {
    D: [
        [1, 1, 1],
        [1, 0, 1],
        [1, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
    ],
    R: [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
        [1, 0, 1],
        [1, 0, 1],
    ],
    O: [
        [1, 1, 1],
        [1, 0, 1],
        [1, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
    ],
    P: [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1],
        [1, 0, 0],
        [1, 0, 0],
    ],
    '+': [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
    ],
    L: [
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
        [1, 1, 1],
    ],
};

const PIP_LAYOUTS = {
    1: [[0, 0]],
    2: [[-0.25, -0.25], [0.25, 0.25]],
    3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
    4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
    5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
    6: [[-0.25, -0.3], [-0.25, 0], [-0.25, 0.3], [0.25, -0.3], [0.25, 0], [0.25, 0.3]],
};

function getLetterWidth(pattern, dieSize, diePadding) {
    const columns = Array.isArray(pattern) && pattern.length > 0 ? pattern[0].length : 0;
    if (columns <= 0) {
        return 0;
    }

    return columns * dieSize + (columns - 1) * diePadding;
}

function getLetterHeight(pattern, dieSize, diePadding) {
    const rows = Array.isArray(pattern) ? pattern.length : 0;
    if (rows <= 0) {
        return 0;
    }

    return rows * dieSize + (rows - 1) * diePadding;
}

export class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });

        const baseDieSize = 60;
        this.dieSize = baseDieSize * 1.2;
        this.diePadding = 10;
        this.letterSpacing = this.dieSize * 0.8;
        this.hasStarted = false;
    }

    create() {
        if (this.cameras && this.cameras.main) {
            this.cameras.main.setBackgroundColor('#111111');
        }

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const titleTopY = centerY - this.dieSize * 2.5;

        const letters = ['D', 'R', 'O', 'P', '+', 'R', 'O', 'L', 'L'];
        const totalWidth = this.calculateTitleWidth(letters);
        const titleHeight = this.getTitleHeight(letters);
        let currentX = centerX - totalWidth / 2;

        letters.forEach((letter) => {
            const pattern = LETTER_PATTERNS[letter];
            const letterWidth = getLetterWidth(pattern, this.dieSize, this.diePadding);
            this.renderLetter(pattern, currentX, titleTopY);
            currentX += letterWidth + this.letterSpacing;
        });

        this.createPlayButton(centerX, titleTopY + titleHeight + 120);
        this.createHintText(centerX, titleTopY + titleHeight + 190);

        this.input.keyboard.once('keydown-SPACE', () => {
            this.startGame();
        });
    }

    calculateTitleWidth(letters) {
        return letters.reduce((total, letter, index) => {
            const pattern = LETTER_PATTERNS[letter];
            const width = getLetterWidth(pattern, this.dieSize, this.diePadding);
            const spacing = index < letters.length - 1 ? this.letterSpacing : 0;
            return total + width + spacing;
        }, 0);
    }

    getTitleHeight(letters) {
        const heights = letters.map((letter) => {
            const pattern = LETTER_PATTERNS[letter];
            return getLetterHeight(pattern, this.dieSize, this.diePadding);
        });

        return heights.length > 0 ? Math.max(...heights) : 0;
    }

    renderLetter(pattern, startX, startY) {
        if (!Array.isArray(pattern)) {
            return;
        }

        pattern.forEach((row, rowIndex) => {
            row.forEach((cell, columnIndex) => {
                if (!cell) {
                    return;
                }

                const x = startX + columnIndex * (this.dieSize + this.diePadding) + this.dieSize / 2;
                const y = startY + rowIndex * (this.dieSize + this.diePadding) + this.dieSize / 2;
                this.createDieArtwork(x, y);
            });
        });
    }

    createDieArtwork(x, y) {
        const dieContainer = this.add.container(x, y);
        const bgColor = 0xf7f3e9;
        const strokeColor = 0x1b1b1b;
        const pipColor = 0x1b1b1b;

        const background = this.add.rectangle(0, 0, this.dieSize, this.dieSize, bgColor);
        background.setOrigin(0.5);
        background.setStrokeStyle(4, strokeColor, 1);
        dieContainer.add(background);

        const pipCount = Phaser.Math.Between(1, 6);
        const layout = PIP_LAYOUTS[pipCount] || PIP_LAYOUTS[1];
        const pipRadius = this.dieSize * 0.08;

        layout.forEach(([offsetX, offsetY]) => {
            const pip = this.add.circle(offsetX * this.dieSize * 0.6, offsetY * this.dieSize * 0.6, pipRadius, pipColor);
            pip.setOrigin(0.5);
            dieContainer.add(pip);
        });

        return dieContainer;
    }

    createPlayButton(x, y) {
        const width = 260;
        const height = 80;
        const buttonContainer = this.add.container(x, y);

        const background = this.add.rectangle(0, 0, width, height, 0xffc857);
        background.setOrigin(0.5);
        background.setStrokeStyle(4, 0xffffff, 1);
        background.setInteractive({ useHandCursor: true });
        buttonContainer.add(background);

        const text = this.add.text(0, 0, 'PLAY', {
            fontSize: '38px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            color: '#111111',
        });
        text.setOrigin(0.5);
        text.setInteractive({ useHandCursor: true });
        buttonContainer.add(text);

        const idleColor = 0xffc857;
        const hoverColor = 0xffd77a;
        const pressColor = 0xffe6a8;

        const setButtonColor = (color) => {
            background.setFillStyle(color);
        };

        const pointerOverHandler = () => setButtonColor(hoverColor);
        const pointerOutHandler = () => setButtonColor(idleColor);
        const pointerUpHandler = () => {
            setButtonColor(idleColor);
            this.startGame();
        };

        [background, text].forEach((obj) => {
            obj.on('pointerover', pointerOverHandler);
            obj.on('pointerout', pointerOutHandler);
            obj.on('pointerdown', () => setButtonColor(pressColor));
            obj.on('pointerup', pointerUpHandler);
        });
    }

    createHintText(x, y) {
        this.add.text(x, y, 'Press SPACE or click PLAY to begin', {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: '#cccccc',
        }).setOrigin(0.5);
    }

    startGame() {
        if (this.hasStarted) {
            return;
        }

        this.hasStarted = true;

        if (this.scene && this.scene.start) {
            this.scene.start('GameScene');
        }
    }
}
