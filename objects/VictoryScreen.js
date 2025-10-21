import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

const CONFETTI_COLORS = [
    0xf1c40f,
    0xe74c3c,
    0x9b59b6,
    0x2ecc71,
    0x3498db
];

export class VictoryScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.background = null;
        this.titleText = null;
        this.messageText = null;
        this.playAgainButton = null;
        this.onPlayAgain = null;
        this.confettiEmitters = [];
    }

    create() {
        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(2000);
        this.container.setVisible(false);
        this.container.setActive(false);
        this.container.setAlpha(0);

        this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);
        this.background.setOrigin(0.5);
        this.background.setInteractive();
        this.background.setScrollFactor(0);

        this.titleText = this.scene.add.text(width / 2, height / 2 - 140, 'Victory!', {
            fontSize: '56px',
            fontStyle: 'bold',
            color: '#f1c40f'
        }).setOrigin(0.5);
        this.titleText.setScrollFactor(0);

        const message = "Congratulations Dicemaster! Your masterful rolling has helped you drop through every level of the dice tower. Thank you for defeating the mighty Status-tician, restoring freedom to the kingdom.";
        this.messageText = this.scene.add.text(width / 2, height / 2, message, {
            fontSize: '26px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 140 }
        }).setOrigin(0.5);
        this.messageText.setScrollFactor(0);

        this.playAgainButton = this.scene.add.text(width / 2, height / 2 + 160, 'PLAY AGAIN', {
            fontSize: '36px',
            color: '#1b1300',
            padding: { x: 36, y: 18 }
        }).setOrigin(0.5);
        this.playAgainButton.setScrollFactor(0);

        applyTextButtonStyle(this.playAgainButton, {
            baseColor: '#f1c40f',
            textColor: '#1b1300',
            hoverBlend: 0.18,
            pressBlend: 0.28,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.55
        });
        setTextButtonEnabled(this.playAgainButton, false);

        this.playAgainButton.on('pointerdown', () => {
            if (!this.playAgainButton.input || !this.playAgainButton.input.enabled) {
                return;
            }

            setTextButtonEnabled(this.playAgainButton, false);
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
    }

    ensureConfettiTexture(color, index) {
        const key = `victory_confetti_${index}`;
        if (this.scene.textures.exists(key)) {
            return key;
        }

        const size = 12;
        const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(color, 1);
        graphics.fillRect(0, 0, size, size);
        graphics.generateTexture(key, size, size);
        graphics.destroy();
        return key;
    }

    startConfetti() {
        this.stopConfetti();
        const { width } = this.scene.scale;
        this.confettiEmitters = CONFETTI_COLORS.map((color, index) => {
            const textureKey = this.ensureConfettiTexture(color, index);
            const particles = this.scene.add.particles(textureKey);
            particles.createEmitter({
                x: { min: 0, max: width },
                y: -40,
                quantity: 2,
                frequency: 100,
                lifespan: 4200,
                speedY: { min: 200, max: 320 },
                speedX: { min: -160, max: 160 },
                rotate: { min: 0, max: 360 },
                angularVelocity: { min: -180, max: 180 },
                gravityY: 350,
                scale: { start: 1, end: 0.6 }
            });
            particles.setDepth(2001);
            particles.setScrollFactor(0);
            return particles;
        });
    }

    stopConfetti() {
        if (!Array.isArray(this.confettiEmitters)) {
            return;
        }

        this.confettiEmitters.forEach(manager => {
            if (manager && typeof manager.destroy === 'function') {
                manager.destroy();
            }
        });
        this.confettiEmitters = [];
    }

    show(onPlayAgain) {
        if (!this.container) {
            this.create();
        }

        this.onPlayAgain = onPlayAgain;

        if (typeof this.scene.acquireModalInputLock === 'function') {
            this.scene.acquireModalInputLock();
        }

        this.container.setVisible(true);
        this.container.setActive(true);
        this.container.setAlpha(0);
        setTextButtonEnabled(this.playAgainButton, true);
        this.startConfetti();

        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 320,
            ease: 'Quad.easeOut'
        });
    }

    hide() {
        if (!this.container) {
            return;
        }

        this.stopConfetti();
        setTextButtonEnabled(this.playAgainButton, false);
        this.container.setVisible(false);
        this.container.setActive(false);
        this.container.setAlpha(0);

        if (typeof this.scene.releaseModalInputLock === 'function') {
            this.scene.releaseModalInputLock();
        }

        this.onPlayAgain = null;
    }
}
