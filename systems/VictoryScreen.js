import { applyTextButtonStyle, setTextButtonEnabled } from '../objects/ui/ButtonStyles.js';

export class VictoryScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.background = null;
        this.messageText = null;
        this.playAgainButton = null;
        this.creditsButton = null;
        this.mainContent = null;
        this.creditsContent = null;
        this.creditsHeader = null;
        this.creditsText = null;
        this.creditsPlayAgainButton = null;
        this.hasPlayedSound = false;
    }

    create() {
        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(1100);

        this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        this.background.setOrigin(0.5);
        this.background.setInteractive({ useHandCursor: false });

        this.mainContent = this.scene.add.container(0, 0);
        this.creditsContent = this.scene.add.container(0, 0);

        const style = {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: Math.floor(width * 0.75) }
        };

        const message = "Congratulations Dicemaster! Your masterful rolling has helped you drop through every level of the dice tower. Thank you for defeating the mighty Status-tician, restoring freedom to the kingdom.";

        this.messageText = this.scene.add.text(width / 2, height / 2 - 40, message, style);
        this.messageText.setOrigin(0.5);

        const buttonStyle = {
            fontSize: '36px',
            color: '#f1c40f',
            padding: { x: 32, y: 18 }
        };

        this.playAgainButton = this.scene.add.text(width / 2, height / 2 + 120, 'PLAY AGAIN', buttonStyle).setOrigin(0.5);
        this.configurePlayAgainButton(this.playAgainButton);

        this.creditsButton = this.scene.add.text(width / 2, height / 2 + 190, 'CREDITS', {
            fontSize: '36px',
            color: '#f1c40f',
            padding: { x: 32, y: 18 }
        }).setOrigin(0.5);

        applyTextButtonStyle(this.creditsButton, {
            baseColor: '#f1c40f',
            textColor: '#f1c40f',
            hoverBlend: 0.14,
            pressBlend: 0.25,
            disabledBlend: 0.45,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });
        setTextButtonEnabled(this.creditsButton, true);

        this.creditsButton.on('pointerdown', () => {
            if (!this.creditsButton.input || !this.creditsButton.input.enabled) {
                return;
            }

            this.showCreditsPanel();
        });

        this.mainContent.add([this.messageText, this.playAgainButton, this.creditsButton]);

        const creditsHeaderStyle = {
            fontSize: '48px',
            color: '#f1c40f',
            align: 'center'
        };

        this.creditsHeader = this.scene.add.text(width / 2, height / 2 - 220, 'CREDITS', creditsHeaderStyle);
        this.creditsHeader.setOrigin(0.5);

        const creditsMessage = [
            'Design:',
            'Nicalai Chananna',
            '',
            'Art:',
            'Castle Sprites: https://raou.itch.io/dark-dun',
            'Map 1: Free Sky Backgrounds (Craftpix)',
            'Map 2: Free Nature Backgrounds Pixel Art (Craftpix)',
            'Map 3: SlashDashGames Parallax Cave',
            '',
            'Music by Sascha Ende',
            'Map 1: Silence of the Sea',
            'Map 2: Fantasy Soundscape',
            'Map 3: Dark Secrets Decision'
        ].join('\n');

        this.creditsText = this.scene.add.bitmapText(width / 2, height / 2 - 40, 'boldPixels', creditsMessage, 24);
        this.creditsText.setOrigin(0.5);
        if (typeof this.creditsText.setCenterAlign === 'function') {
            this.creditsText.setCenterAlign();
        }
        if (typeof this.creditsText.setMaxWidth === 'function') {
            this.creditsText.setMaxWidth(Math.floor(width * 0.8));
        }

        this.creditsPlayAgainButton = this.scene.add.text(width / 2, height / 2 + 220, 'PLAY AGAIN', buttonStyle).setOrigin(0.5);
        this.configurePlayAgainButton(this.creditsPlayAgainButton);

        this.creditsContent.add([this.creditsHeader, this.creditsText, this.creditsPlayAgainButton]);
        this.creditsContent.setVisible(false);
        this.creditsContent.setActive(false);

        this.container.add([this.background, this.mainContent, this.creditsContent]);

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

        this.showMainPanel();

        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 400,
            ease: 'Quad.easeOut'
        });

        if (!this.hasPlayedSound && this.scene && typeof this.scene.playSound === 'function') {
            this.scene.playSound('towerOfTenWin', { volume: 0.9 });
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

        if (this.creditsButton) {
            setTextButtonEnabled(this.creditsButton, false);
        }

        if (this.creditsPlayAgainButton) {
            setTextButtonEnabled(this.creditsPlayAgainButton, false);
        }

        if (this.mainContent) {
            this.mainContent.setVisible(false);
            this.mainContent.setActive(false);
        }

        if (this.creditsContent) {
            this.creditsContent.setVisible(false);
            this.creditsContent.setActive(false);
        }
    }

    configurePlayAgainButton(button) {
        if (!button) {
            return;
        }

        applyTextButtonStyle(button, {
            baseColor: '#f1c40f',
            textColor: '#f1c40f',
            hoverBlend: 0.14,
            pressBlend: 0.25,
            disabledBlend: 0.45,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });
        setTextButtonEnabled(button, true);

        button.on('pointerdown', () => {
            if (!button.input || !button.input.enabled) {
                return;
            }

            setTextButtonEnabled(button, false, { disabledAlpha: 0.6 });

            if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
                window.location.reload();
            } else if (this.scene && this.scene.scene && typeof this.scene.scene.restart === 'function') {
                this.scene.scene.restart({
                    sfxVolume: this.scene.sfxVolume,
                    musicVolume: this.scene.musicVolume,
                    testingModeEnabled: this.scene.testingModeEnabled
                });
            }
        });
    }

    showMainPanel() {
        if (this.mainContent) {
            this.mainContent.setVisible(true);
            this.mainContent.setActive(true);
        }

        if (this.playAgainButton) {
            setTextButtonEnabled(this.playAgainButton, true);
        }

        if (this.creditsButton) {
            setTextButtonEnabled(this.creditsButton, true);
        }

        if (this.creditsContent) {
            this.creditsContent.setVisible(false);
            this.creditsContent.setActive(false);
        }

        if (this.creditsPlayAgainButton) {
            setTextButtonEnabled(this.creditsPlayAgainButton, false);
        }
    }

    showCreditsPanel() {
        if (this.mainContent) {
            this.mainContent.setVisible(false);
            this.mainContent.setActive(false);
        }

        if (this.playAgainButton) {
            setTextButtonEnabled(this.playAgainButton, false);
        }

        if (this.creditsButton) {
            setTextButtonEnabled(this.creditsButton, false);
        }

        if (this.creditsContent) {
            this.creditsContent.setVisible(true);
            this.creditsContent.setActive(true);
        }

        if (this.creditsPlayAgainButton) {
            setTextButtonEnabled(this.creditsPlayAgainButton, true);
        }
    }
}
