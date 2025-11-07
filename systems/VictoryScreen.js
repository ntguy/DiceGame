import { applyTextButtonStyle, setTextButtonEnabled } from '../objects/ui/ButtonStyles.js';

export class VictoryScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.background = null;
        this.mainContent = null;
        this.creditsContent = null;
        this.messageText = null;
        this.playAgainButtons = [];
        this.creditsButton = null;
        this.backButton = null;
        this.hasPlayedSound = false;
    }

    create() {
        const { width, height } = this.scene.scale;

        this.playAgainButtons = [];

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

        this.mainContent = this.scene.add.container(0, 0);

        const message = "Congratulations Dicemaster! Your masterful rolling has helped you drop through every level of the dice\ntower. Thank you for defeating the mighty Status-tician, restoring freedom to the kingdom.";

        this.messageText = this.scene.add.text(width / 2, height / 2 - 40, message, style);
        this.messageText.setOrigin(0.5);

        const mainPlayAgainButton = this.createPlayAgainButton(width / 2, height / 2 + 120);

        this.creditsButton = this.scene.add.text(width / 2, height / 2 + 190, 'CREDITS', {
            fontSize: '32px',
            color: '#f1c40f',
            padding: { x: 26, y: 16 }
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

            this.showCredits();
        });

        this.mainContent.add([this.messageText, mainPlayAgainButton, this.creditsButton]);

        this.creditsContent = this.scene.add.container(0, 0);
        this.creditsContent.setVisible(false);
        this.creditsContent.setActive(false);

        const creditsTitle = this.scene.add.text(width / 2, height / 2 - 345, 'CREDITS', {
            fontSize: '48px',
            color: '#f1c40f'
        }).setOrigin(0.5);

        const creditsDetails = [
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

        const creditsText = this.scene.add.text(width / 2, height / 2 - 305, creditsDetails, {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: Math.floor(width * 0.75) }
        }).setOrigin(0.5, 0);

        const creditsPlayAgainButton = this.createPlayAgainButton(width / 2, height / 2 + 240);

        this.backButton = this.scene.add.text(width / 2, height / 2 + 180, 'BACK', {
            fontSize: '32px',
            color: '#f1c40f',
            padding: { x: 24, y: 16 }
        }).setOrigin(0.5);

        applyTextButtonStyle(this.backButton, {
            baseColor: '#f1c40f',
            textColor: '#f1c40f',
            hoverBlend: 0.14,
            pressBlend: 0.25,
            disabledBlend: 0.45,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });
        setTextButtonEnabled(this.backButton, true);

        this.backButton.on('pointerdown', () => {
            if (!this.backButton.input || !this.backButton.input.enabled) {
                return;
            }

            this.showMainContent();
        });

        this.creditsContent.add([creditsTitle, creditsText, this.backButton, creditsPlayAgainButton]);

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

        this.showMainContent();

        this.container.setVisible(true);
        this.container.setActive(true);
        this.container.setAlpha(0);

        this.playAgainButtons.forEach(button => setTextButtonEnabled(button, true));
        if (this.creditsButton) {
            setTextButtonEnabled(this.creditsButton, true);
        }
        if (this.backButton) {
            setTextButtonEnabled(this.backButton, false);
        }

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

        this.playAgainButtons.forEach(button => setTextButtonEnabled(button, false));
        if (this.creditsButton) {
            setTextButtonEnabled(this.creditsButton, false);
        }
        if (this.backButton) {
            setTextButtonEnabled(this.backButton, false);
        }
    }

    createPlayAgainButton(x, y) {
        const button = this.scene.add.text(x, y, 'PLAY AGAIN', {
            fontSize: '36px',
            color: '#f1c40f',
            padding: { x: 32, y: 18 }
        }).setOrigin(0.5);

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

            this.playAgainButtons.forEach(btn => setTextButtonEnabled(btn, false, { disabledAlpha: 0.6 }));

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

        this.playAgainButtons.push(button);

        return button;
    }

    showCredits() {
        if (this.mainContent) {
            this.mainContent.setVisible(false);
            this.mainContent.setActive(false);
        }

        if (this.creditsContent) {
            this.creditsContent.setVisible(true);
            this.creditsContent.setActive(true);
        }

        if (this.creditsButton) {
            setTextButtonEnabled(this.creditsButton, false);
        }

        if (this.backButton) {
            setTextButtonEnabled(this.backButton, true);
        }
    }

    showMainContent() {
        if (this.creditsContent) {
            this.creditsContent.setVisible(false);
            this.creditsContent.setActive(false);
        }

        if (this.mainContent) {
            this.mainContent.setVisible(true);
            this.mainContent.setActive(true);
        }

        if (this.creditsButton) {
            setTextButtonEnabled(this.creditsButton, true);
        }

        if (this.backButton) {
            setTextButtonEnabled(this.backButton, false);
        }
    }
}
