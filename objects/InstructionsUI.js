import { createModal, destroyModal } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';
import { createDieFace, setDieBackgroundFill, setDieStroke } from './ui/DieFace.js';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 540;
const BODY_WIDTH = PANEL_WIDTH - 160;
const PAGE_SPACING = 60;

const PAGES = [
    {
        title: 'Welcome to Dice Game (WIP)!',
        body: 'Descend through multiple maps, battling monsters and building your collection of powerful dice along the way.'
    },
    {
        title: 'Rolling & Resolving',
        body: 'At the start of each battle, roll all your dice to form your opening hand.\nYou have 2 re-rolls to use on any number of dice, aiming to form combos to place in the Defend (🛡️) and Attack (⚔️) zones.\nAfter arranging your dice, press Resolve to play your turn.'
    },
    {
        title: 'Zone Scoring',
        body: 'Zone Total = Face Value (FV) + Combo Bonus\n* FV (Face Value): The sum of the die faces in a zone.\n* Combo Bonus: The rarer the pattern, the higher the bonus. Check the in-game menu for combo values.'
    },
    {
        title: 'Collecting Dice',
        body: 'After each battle, you’ll choose one special die to add to your hand.\nYou can hold up to 6, after which you’ll have to discard to make room for more!\nClick on a die’s icon during battle for a reminder of its effect.'
    },
    {
        title: 'Relics',
        body: 'Relics give you permanent upgrades throughout your run, but like dice, you can only have 6 at a time!\nRelics can be purchased in shops or earned by defeating bosses.'
    },
    {
        title: 'Curses',
        body: 'Some enemies can curse your dice. Curses are cleansed if the die is left unused for one turn.\nLock: Locked dice can’t be re-rolled.\nWeaken: Weakened dice contribute no FV in zone scoring.'
    }
];

const SELECTED_FILL_COLOR = 0x2ecc71;
const UNSELECTED_FILL_COLOR = 0x444444;
const SELECTED_STROKE_COLOR = 0xf1c40f;
const UNSELECTED_STROKE_COLOR = 0xffffff;

export class InstructionsUI {
    constructor(scene) {
        this.scene = scene;
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.closeButton = null;
        this.titleText = null;
        this.bodyText = null;
        this.pageDice = [];
        this.pageIndex = 0;
        this.isVisible = false;

        this.create();
        this.setVisible(false);
    }

    create() {
        const modal = createModal(this.scene, {
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
            panelColor: 0x111a26,
            panelAlpha: 0.96,
            strokeColor: 0x3498db,
            strokeAlpha: 0.95,
            title: 'How to Play',
            titleStyle: {
                fontSize: '42px',
                color: '#5dade2',
                fontStyle: 'bold'
            },
            subtitle: 'Master the basics of dice combat to conquer the dungeon.',
            subtitleStyle: {
                fontSize: '22px',
                color: '#d6eaf8'
            },
            depth: 110
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        if (this.backdrop) {
            this.backdrop.on('pointerup', () => {
                this.scene.closeInstructions();
            });
        }

        const contentTop = -PANEL_HEIGHT / 2 + 160;

        this.titleText = this.scene.add.text(0, contentTop, '', {
            fontSize: '30px',
            color: '#f4d03f',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: BODY_WIDTH }
        }).setOrigin(0.5, 0.5);

        this.bodyText = this.scene.add.text(0, this.titleText.y + 40, '', {
            fontSize: '20px',
            color: '#ecf0f1',
            align: 'left',
            lineSpacing: 6,
            wordWrap: { width: BODY_WIDTH }
        }).setOrigin(0.5, 0);

        this.container.add(this.titleText);
        this.container.add(this.bodyText);

        this.createCloseButton();
        this.createPageSelectors();
        this.refreshContent();
    }

    createCloseButton() {
        const buttonWidth = 160;
        const buttonHeight = 52;
        const buttonY = PANEL_HEIGHT / 2 - 60;

        const buttonBg = this.scene.add.rectangle(0, buttonY, buttonWidth, buttonHeight, 0x1b2631, 0.92)
            .setStrokeStyle(2, 0x5dade2, 0.9)
            .setInteractive({ useHandCursor: true });

        const buttonText = this.scene.add.text(0, buttonY, 'Close', {
            fontSize: '22px',
            color: '#d6eaf8',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        applyRectangleButtonStyle(buttonBg, {
            baseColor: 0x1b2631,
            baseAlpha: 0.92,
            hoverBlend: 0.18,
            pressBlend: 0.3,
            disabledBlend: 0.5,
            enabledAlpha: 1,
            disabledAlpha: 0.45
        });

        buttonBg.on('pointerup', () => {
            this.scene.closeInstructions();
        });

        this.container.add(buttonBg);
        this.container.add(buttonText);

        this.closeButton = { background: buttonBg, label: buttonText };
    }

    createPageSelectors() {
        const selectorY = PANEL_HEIGHT / 2 - 130;
        const firstDieX = -((PAGES.length - 1) * PAGE_SPACING) / 2;

        const label = this.scene.add.text(firstDieX - 70, selectorY, 'Page:', {
            fontSize: '22px',
            color: '#d6eaf8',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);
        this.container.add(label);

        this.pageDice = PAGES.map((_, index) => {
            const dieFace = createDieFace(this.scene, {
                size: 52,
                backgroundColor: UNSELECTED_FILL_COLOR,
                strokeColor: UNSELECTED_STROKE_COLOR,
                strokeWidth: 3,
                strokeAlpha: 0.5
            });

            dieFace.setValue(index + 1);

            const dieX = firstDieX + index * PAGE_SPACING;
            const dieContainer = dieFace.container;
            dieContainer.setPosition(dieX, selectorY);
            dieContainer.setSize(52, 52);
            dieContainer.setInteractive({ useHandCursor: true });

            dieContainer.on('pointerup', () => {
                this.setPage(index);
            });

            dieContainer.on('pointerover', () => {
                if (index !== this.pageIndex) {
                    setDieBackgroundFill(dieFace, 0x555555, 1);
                }
            });

            dieContainer.on('pointerout', () => {
                this.updatePageDiceStyles();
            });

            this.container.add(dieContainer);

            return { dieFace, container: dieContainer };
        });

        this.updatePageDiceStyles();
    }

    setVisible(visible) {
        this.isVisible = !!visible;
        if (this.backdrop) {
            this.backdrop.setVisible(this.isVisible);
            if (this.backdrop.input) {
                this.backdrop.input.enabled = this.isVisible;
            }
            this.backdrop.setActive(this.isVisible);
        }
        if (this.container) {
            this.container.setVisible(this.isVisible);
            this.container.setActive(this.isVisible);
        }
    }

    open() {
        if (this.isVisible) {
            return;
        }
        this.setVisible(true);
        this.scene.input.setTopOnly(true);
    }

    close() {
        if (!this.isVisible) {
            return;
        }
        this.setVisible(false);
        this.scene.input.setTopOnly(false);
    }

    setPage(index) {
        const normalized = Phaser.Math.Clamp(index, 0, PAGES.length - 1);
        if (normalized === this.pageIndex) {
            return;
        }
        this.pageIndex = normalized;
        this.refreshContent();
    }

    refreshContent() {
        const entry = PAGES[this.pageIndex] || PAGES[0];
        if (this.titleText) {
            this.titleText.setText(entry.title || '');
        }
        if (this.bodyText) {
            this.bodyText.setText(entry.body || '');
        }
        this.updatePageDiceStyles();
    }

    updatePageDiceStyles() {
        this.pageDice.forEach(({ dieFace }, index) => {
            const isSelected = index === this.pageIndex;
            const fillColor = isSelected ? SELECTED_FILL_COLOR : UNSELECTED_FILL_COLOR;
            const strokeColor = isSelected ? SELECTED_STROKE_COLOR : UNSELECTED_STROKE_COLOR;
            const strokeAlpha = isSelected ? 0.95 : 0.4;
            setDieBackgroundFill(dieFace, fillColor, 1);
            setDieStroke(dieFace, 3, strokeColor, strokeAlpha);
        });
    }

    destroy() {
        if (this.closeButton) {
            if (this.closeButton.background) {
                this.closeButton.background.destroy();
            }
            if (this.closeButton.label) {
                this.closeButton.label.destroy();
            }
            this.closeButton = null;
        }

        this.pageDice.forEach(({ dieFace }) => {
            if (dieFace && typeof dieFace.destroy === 'function') {
                dieFace.destroy();
            }
        });
        this.pageDice = [];

        destroyModal(this.modal);
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.titleText = null;
        this.bodyText = null;
    }
}
