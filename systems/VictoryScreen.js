import { applyTextButtonStyle, setTextButtonEnabled } from '../objects/ui/ButtonStyles.js';

export class VictoryScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.background = null;
        this.messageText = null;
        this.playAgainButton = null;
        this.hasPlayedSound = false;
    }

    create() {
        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(1100);

        this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        this.background.setOrigin(0.5);
        this.background.setInteractive({ useHandCursor: false });

        const style = {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: Math.floor(width * 0.75) }
        };

        const message = "Congratulations Dicemaster! Your masterful rolling has helped you drop through every level of the dice tower. Thank you for defeating the mighty Status-tician, restoring freedom to the kingdom.";

        this.messageText = this.scene.add.text(width / 2, height / 2 - 40, message, style);
        this.messageText.setOrigin(0.5);

        this.playAgainButton = this.scene.add.text(width / 2, height / 2 + 120, 'PLAY AGAIN', {
            fontSize: '36px',
            color: '#1b1300',
            padding: { x: 32, y: 18 }
        }).setOrigin(0.5);

        applyTextButtonStyle(this.playAgainButton, {
            baseColor: '#f1c40f',
            textColor: '#1b1300',
            hoverBlend: 0.14,
            pressBlend: 0.25,
            disabledBlend: 0.45,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });
        setTextButtonEnabled(this.playAgainButton, true);

        this.playAgainButton.on('pointerdown', () => {
            if (!this.playAgainButton.input || !this.playAgainButton.input.enabled) {
                return;
            }

            setTextButtonEnabled(this.playAgainButton, false, { disabledAlpha: 0.6 });

            if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
                window.location.reload();
            } else if (this.scene && this.scene.scene && typeof this.scene.scene.restart === 'function') {
                this.scene.scene.restart({
                    isMuted: this.scene.isMuted,
                    isMusicMuted: this.scene.isMusicMuted,
                    testingModeEnabled: this.scene.testingModeEnabled
                });
            }
        });

        this.container.add([this.background, this.messageText, this.playAgainButton]);

        this.hide();
    }

    show() {
        if (!this.container) {
            this.create();
        }

        if (this.background) {
            this.background.setInteractive({ useHandCursor: false });
        }

        this.container.setVisible(true);
        this.container.setActive(true);
        this.container.setAlpha(0);

        if (this.playAgainButton) {
            setTextButtonEnabled(this.playAgainButton, true);
        }

        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 400,
            ease: 'Quad.easeOut'
        });

        if (!this.hasPlayedSound && this.scene && this.scene.sound && typeof this.scene.sound.play === 'function') {
            this.scene.sound.play('towerOfTenWin', { volume: 0.9 });
            this.hasPlayedSound = true;
        }
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
    }
}
