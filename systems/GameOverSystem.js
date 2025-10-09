export class GameOverManager {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.background = null;
        this.retryButton = null;
        this.onRetry = null;
    }

    create() {
        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(1000);

        this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);
        this.background.setOrigin(0.5);
        this.background.setInteractive();

        const title = this.scene.add.text(width / 2, height / 2 - 60, 'Game Over', {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const subtitle = this.scene.add.text(width / 2, height / 2, 'The enemy has defeated you.', {
            fontSize: '24px',
            color: '#ecf0f1'
        }).setOrigin(0.5);

        this.retryButton = this.scene.add.text(width / 2, height / 2 + 80, 'RETRY', {
            fontSize: '36px',
            color: '#000000',
            backgroundColor: '#f1c40f',
            padding: { x: 30, y: 16 }
        }).setOrigin(0.5);

        this.retryButton.on('pointerdown', () => {
            if (!this.retryButton.input || !this.retryButton.input.enabled) {
                return;
            }

            this.retryButton.disableInteractive();
            if (typeof this.onRetry === 'function') {
                this.onRetry();
            }
        });

        this.retryButton.on('pointerover', () => {
            this.retryButton.setStyle({ backgroundColor: '#f39c12' });
        });

        this.retryButton.on('pointerout', () => {
            this.retryButton.setStyle({ backgroundColor: '#f1c40f' });
        });

        this.container.add([this.background, title, subtitle, this.retryButton]);

        this.hide();
    }

    show(onRetry) {
        if (!this.container) {
            this.create();
        }

        this.onRetry = onRetry;

        this.container.setVisible(true);
        this.container.setActive(true);
        this.container.setAlpha(0);

        if (this.background) {
            this.background.setInteractive();
        }

        if (this.retryButton) {
            this.retryButton.setInteractive({ useHandCursor: true });
            this.retryButton.setStyle({ backgroundColor: '#f1c40f' });
        }

        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 250,
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

        if (this.retryButton) {
            this.retryButton.disableInteractive();
        }

        this.onRetry = null;
    }
}
