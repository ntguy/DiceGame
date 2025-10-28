export class VictoryScreen {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.background = null;
        this.messageText = null;
    }

    create() {
        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(1100);

        this.background = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        this.background.setOrigin(0.5);
        this.background.setInteractive({ useHandCursor: false });

        const style = {
            fontSize: '28px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: Math.floor(width * 0.75) }
        };

        const message = "Congratulations Dicemaster! Your masterful rolling has helped you drop through every level of the dice tower. Thank you for defeating the mighty Status-tician, restoring freedom to the kingdom.";

        this.messageText = this.scene.add.text(width / 2, height / 2, message, style);
        this.messageText.setOrigin(0.5);

        this.container.add([this.background, this.messageText]);

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

        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 400,
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
    }
}
