import { applyTextButtonStyle, setTextButtonEnabled } from './ui/ButtonStyles.js';

const CONFETTI_TEXTURE_KEY = 'victory_confetti_particle';
const CONFETTI_COLORS = [
    0xf1c40f,
    0xe67e22,
    0x1abc9c,
    0x9b59b6,
    0xe74c3c,
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
        this.confettiParticles = null;
        this.confettiEmitter = null;
    }

    ensureConfettiTexture() {
        const { scene } = this;
        if (!scene || !scene.textures || typeof scene.textures.exists !== 'function') {
            return;
        }

        if (scene.textures.exists(CONFETTI_TEXTURE_KEY)) {
            return;
        }

        const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 6, 12);
        graphics.generateTexture(CONFETTI_TEXTURE_KEY, 6, 12);
        graphics.destroy();
    }

    createConfetti(width) {
        if (!this.scene || !this.scene.add || this.confettiParticles) {
            return;
        }

        this.ensureConfettiTexture();

        this.confettiParticles = this.scene.add.particles(CONFETTI_TEXTURE_KEY);
        this.confettiParticles.setDepth(1105);
        this.confettiParticles.setVisible(false);
        this.confettiParticles.setActive(false);

        if (!this.confettiParticles || typeof this.confettiParticles.createEmitter !== 'function') {
            return;
        }

        const emitterConfig = {
            x: { min: 0, max: width },
            y: -20,
            lifespan: 3600,
            speedY: { min: 180, max: 260 },
            speedX: { min: -120, max: 120 },
            angle: { min: 170, max: 190 },
            rotate: { min: 0, max: 360 },
            gravityY: 260,
            scale: { start: 1, end: 0.4 },
            quantity: 4,
            frequency: 120,
            tint: CONFETTI_COLORS,
            alpha: { start: 1, end: 0 }
        };

        if (typeof Phaser !== 'undefined' && Phaser.BlendModes && typeof Phaser.BlendModes.NORMAL !== 'undefined') {
            emitterConfig.blendMode = Phaser.BlendModes.NORMAL;
        }

        this.confettiEmitter = this.confettiParticles.createEmitter(emitterConfig);

        if (this.confettiEmitter) {
            this.confettiEmitter.stop();
        }
    }

    create() {
        if (!this.scene) {
            return;
        }

        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(1100);

        this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);
        this.background.setOrigin(0.5);
        this.background.setInteractive();

        this.titleText = this.scene.add.text(width / 2, height / 2 - 150, 'Victory!', {
            fontSize: '56px',
            color: '#f1c40f',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const message = "Congratulations Dicemaster! Your masterful rolling has helped you drop through every level of the dice tower. Thank you for defeating the mighty Status-tician, restoring freedom to the kingdom.";
        this.messageText = this.scene.add.text(width / 2, height / 2 - 30, message, {
            fontSize: '26px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: Math.min(760, width - 120) },
            lineSpacing: 10
        }).setOrigin(0.5);

        this.playAgainButton = this.scene.add.text(width / 2, height / 2 + 150, 'PLAY AGAIN', {
            fontSize: '36px',
            color: '#1b1300',
            padding: { x: 30, y: 16 }
        }).setOrigin(0.5);

        applyTextButtonStyle(this.playAgainButton, {
            baseColor: '#f1c40f',
            textColor: '#1b1300',
            hoverBlend: 0.16,
            pressBlend: 0.3,
            disabledBlend: 0.45,
            enabledAlpha: 1,
            disabledAlpha: 0.5
        });
        setTextButtonEnabled(this.playAgainButton, true);

        this.playAgainButton.on('pointerdown', () => {
            if (!this.playAgainButton || !this.playAgainButton.input || !this.playAgainButton.input.enabled) {
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

        this.createConfetti(width);

        this.hide();
    }

    show(onPlayAgain) {
        if (!this.container) {
            this.create();
        }

        this.onPlayAgain = onPlayAgain;

        if (this.playAgainButton) {
            setTextButtonEnabled(this.playAgainButton, true);
        }

        if (this.background) {
            this.background.setInteractive();
        }

        if (this.scene && typeof this.scene.acquireModalInputLock === 'function') {
            this.scene.acquireModalInputLock();
        }

        this.container.setVisible(true);
        this.container.setActive(true);
        this.container.setAlpha(0);

        if (this.confettiParticles) {
            this.confettiParticles.setVisible(true);
            this.confettiParticles.setActive(true);
        }

        if (this.confettiEmitter) {
            this.confettiEmitter.start();
        }

        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 300,
            ease: 'Quad.easeOut'
        });
    }

    hide() {
        if (!this.container) {
            return;
        }

        this.container.setVisible(false);
        this.container.setActive(false);
        this.container.setAlpha(0);

        if (this.background) {
            this.background.disableInteractive();
        }

        if (this.playAgainButton) {
            setTextButtonEnabled(this.playAgainButton, false);
        }

        if (this.scene && typeof this.scene.releaseModalInputLock === 'function') {
            this.scene.releaseModalInputLock();
        }

        if (this.confettiEmitter) {
            this.confettiEmitter.stop();
        }

        if (this.confettiParticles) {
            this.confettiParticles.setVisible(false);
            this.confettiParticles.setActive(false);
        }

        this.onPlayAgain = null;
    }
}
