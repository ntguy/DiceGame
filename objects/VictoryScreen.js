import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

const CONFETTI_TEXTURE_KEY = 'victory_confetti_piece';

export class VictoryScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.background = null;
        this.titleText = null;
        this.messageText = null;
        this.playAgainButton = null;
        this.onPlayAgain = null;
        this.confettiManager = null;
        this.confettiEmitter = null;
    }

    create() {
        if (!this.scene) {
            return;
        }

        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(1100);

        this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
        this.background.setOrigin(0.5);
        this.background.setInteractive();

        this.titleText = this.scene.add.text(width / 2, height / 2 - 140, 'Victory!', {
            fontSize: '54px',
            color: '#f1c40f',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const message = [
            'Congratulations Dicemaster! Your masterful rolling has helped you drop through every level of the dice tower.',
            'Thank you for defeating the mighty Status-tician, restoring freedom to the kingdom.'
        ].join('\n\n');

        this.messageText = this.scene.add.text(width / 2, height / 2, message, {
            fontSize: '24px',
            color: '#ecf0f1',
            align: 'center',
            wordWrap: { width: Math.min(720, width - 120), useAdvancedWrap: true }
        }).setOrigin(0.5);

        this.playAgainButton = this.scene.add.text(width / 2, height / 2 + 140, 'PLAY AGAIN', {
            fontSize: '36px',
            color: '#1b1300',
            padding: { x: 32, y: 16 }
        }).setOrigin(0.5);

        applyTextButtonStyle(this.playAgainButton, {
            baseColor: '#2ecc71',
            textColor: '#1b1300',
            hoverBlend: 0.12,
            pressBlend: 0.26,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.5
        });
        setTextButtonEnabled(this.playAgainButton, true);

        this.playAgainButton.on('pointerdown', () => {
            if (!this.playAgainButton.input || !this.playAgainButton.input.enabled) {
                return;
            }

            setTextButtonEnabled(this.playAgainButton, false, { disabledAlpha: 0.6 });
            if (typeof this.onPlayAgain === 'function') {
                this.onPlayAgain();
            }
        });

        this.container.add([
            this.background,
            this.titleText,
            this.messageText,
            this.playAgainButton
        ]);

        this.createConfettiEmitter();

        this.hide();
    }

    ensureConfettiTexture() {
        if (!this.scene || !this.scene.textures) {
            return;
        }

        if (this.scene.textures.exists(CONFETTI_TEXTURE_KEY)) {
            return;
        }

        const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRoundedRect(0, 0, 10, 16, 3);
        graphics.generateTexture(CONFETTI_TEXTURE_KEY, 10, 16);
        graphics.destroy();
    }

    createConfettiEmitter() {
        this.ensureConfettiTexture();
        if (!this.scene || !this.scene.add || !this.scene.textures.exists(CONFETTI_TEXTURE_KEY)) {
            return;
        }

        this.confettiManager = this.scene.add.particles(CONFETTI_TEXTURE_KEY);
        this.confettiManager.setDepth(1099);

        const { width } = this.scene.scale;

        this.confettiEmitter = this.confettiManager.createEmitter({
            x: { min: width * 0.1, max: width * 0.9 },
            y: -30,
            lifespan: 4200,
            speedY: { min: 220, max: 360 },
            speedX: { min: -140, max: 140 },
            quantity: 5,
            frequency: 120,
            rotate: { start: 0, end: 360 },
            angle: { min: 260, max: 280 },
            gravityY: 240,
            alpha: { start: 1, end: 0 },
            scale: { start: 0.8, end: 0.8 },
            tint: [0xf1c40f, 0xe67e22, 0xe74c3c, 0x3498db, 0x9b59b6, 0x2ecc71]
        });

        this.confettiEmitter.stop();
        this.confettiManager.setVisible(false);
        this.confettiManager.setActive(false);
    }

    show({ onPlayAgain } = {}) {
        if (!this.container) {
            this.create();
        }

        this.onPlayAgain = onPlayAgain;

        if (this.container) {
            this.container.setVisible(true);
            this.container.setActive(true);
            this.container.setAlpha(0);

            if (this.background) {
                this.background.setInteractive();
            }

            if (this.playAgainButton) {
                setTextButtonEnabled(this.playAgainButton, true);
            }

            this.scene.tweens.add({
                targets: this.container,
                alpha: 1,
                duration: 300,
                ease: 'Quad.easeOut'
            });
        }

        if (this.confettiManager) {
            this.confettiManager.setVisible(true);
            this.confettiManager.setActive(true);
        }

        if (this.confettiEmitter) {
            this.confettiEmitter.start();
        }
    }

    hide() {
        if (this.container) {
            this.container.setVisible(false);
            this.container.setActive(false);
            this.container.setAlpha(0);
        }

        if (this.background) {
            this.background.disableInteractive();
        }

        if (this.playAgainButton) {
            setTextButtonEnabled(this.playAgainButton, false);
        }

        if (this.confettiEmitter) {
            this.confettiEmitter.stop();
        }

        if (this.confettiManager) {
            this.confettiManager.setVisible(false);
            this.confettiManager.setActive(false);
        }

        this.onPlayAgain = null;
    }
}
