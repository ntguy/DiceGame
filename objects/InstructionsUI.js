import { createModal, destroyModal } from './ui/ModalComponents.js';
import { applyRectangleButtonStyle } from './ui/ButtonStyles.js';
import { createDieFace, setDieBackgroundFill, setDieStroke } from './ui/DieFace.js';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 540;
const BODY_WIDTH = PANEL_WIDTH - 160;
const PAGE_SPACING = 60;

const KEYWORD_COLOR = '#f4d03f';
const DEFENSE_COLOR = '#5dade2';
const ATTACK_COLOR = '#e74c3c';
const BODY_TEXT_COLOR = '#ecf0f1';
const BULLET_COLOR = '#f7dc6f';
const BULLET_INDENT = 28;
const BULLET_LINE_HEIGHT = 30;
const BULLET_SPACING = 16;
const BODY_PADDING = 80;

const PAGES = [
    {
        title: 'Welcome to Dice Game (WIP)!',
        points: [
            {
                text: 'Descend through multiple maps, battling monsters and growing your collection of dice.',
            },
            {
                text: 'Choose your path wisely to power up between battles.',
            }
        ]
    },
    {
        title: 'Rolling & Resolving',
        points: [
            {
                text: 'At the start of each battle, roll all your dice to form your opening hand.',
                keywords: [{ phrase: 'roll', color: KEYWORD_COLOR }]
            },
            {
                text: 'You have 2 re-rolls to use on any number of dice, aiming to form combos to place in the Defend (🛡️) and Attack (⚔️) zones.',
                keywords: [
                    { phrase: '2 re-rolls', color: KEYWORD_COLOR },
                    { phrase: 'Defend (🛡️)', color: DEFENSE_COLOR },
                    { phrase: 'Attack (⚔️)', color: ATTACK_COLOR }
                ]
            },
            {
                text: 'Press Resolve to play your turn.',
                keywords: [{ phrase: 'Resolve', color: KEYWORD_COLOR }]
            }
        ]
    },
    {
        title: 'Zone Scoring',
        points: [
            {
                text: 'Zone Total equals Face Value plus any Combo Bonus.',
                keywords: [
                    { phrase: 'Zone Total', color: KEYWORD_COLOR },
                    { phrase: 'Face Value', color: KEYWORD_COLOR },
                    { phrase: 'Combo Bonus', color: KEYWORD_COLOR }
                ]
            },
            {
                text: 'Face Value: adds the sum of die faces placed in a zone.',
                keywords: [{ phrase: 'Face Value', color: KEYWORD_COLOR }]
            },
            {
                text: 'Combo Bonus: rewards rarer patterns — check the menu (☰) for exact values.',
                keywords: [{ phrase: 'Combo Bonus', color: KEYWORD_COLOR }]
            }
        ]
    },
    {
        title: 'Collecting Dice',
        points: [
            {
                text: 'Choose a special die after each battle to improve your hand.',
                keywords: [{ phrase: 'special die', color: KEYWORD_COLOR }]
            },
            {
                text: 'Carry up to 6 dice. Discard within your pack to make room for new finds.',
                keywords: [{ phrase: '6', color: KEYWORD_COLOR }]
            },
            {
                text: 'Tap a die icon during battle for a reminder of its effect.',
            }
        ]
    },
    {
        title: 'Relics',
        points: [
            {
                text: 'Relics are found in shops or after bosses.',
                keywords: [{ phrase: 'Relics', color: KEYWORD_COLOR }, { phrase: 'shops', color: KEYWORD_COLOR }, { phrase: 'bosses', color: KEYWORD_COLOR }]
            },
            {
                text: 'Carry up to 6 relics at once. Sell within your pack to make room for new finds.',
                keywords: [{ phrase: '6', color: KEYWORD_COLOR }, { phrase: 'Sell', color: KEYWORD_COLOR }]
            },
            {
                text: 'Tap a relic icon during battle for a reminder of its effect.',
            }
        ]
    },
    {
        title: 'Curses',
        points: [
            {
                text: 'Some enemies can apply curses to your dice, which are cleansed if the die is unused for a turn.',
                keywords: [{ phrase: 'curses', color: KEYWORD_COLOR }, { phrase: 'cleansed', color: KEYWORD_COLOR }, { phrase: 'unused', color: KEYWORD_COLOR }]
            },
            {
                text: 'Locked dice cannot be re-rolled.',
                keywords: [{ phrase: 'Locked', color: KEYWORD_COLOR }]
            },
            {
                text: 'Weakened dice contribute no FV in zone scoring.',
                keywords: [
                    { phrase: 'Weakened', color: KEYWORD_COLOR },
                    { phrase: 'FV', color: KEYWORD_COLOR }
                ]
            }
        ]
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
        this.bodyContainer = null;
        this.bodyEntries = [];
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
            depth: 110
        });

        this.modal = modal;
        this.backdrop = modal.backdrop;
        this.container = modal.container;

        const contentTop = -PANEL_HEIGHT / 2 + 120;

        this.titleText = this.scene.add.text(0, contentTop, '', {
            fontSize: '32px',
            color: '#f4d03f',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: BODY_WIDTH }
        }).setOrigin(0.5, 0.5);

        this.bodyContainer = this.scene.add.container(0, this.titleText.y + 36);

        this.container.add(this.titleText);
        this.container.add(this.bodyContainer);

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
        if (this.scene) {
            if (typeof this.scene.acquireModalInputLock === 'function') {
                this.scene.acquireModalInputLock();
            } else if (this.scene.input) {
                this.scene.input.setTopOnly(true);
            }
        }
    }

    close() {
        if (!this.isVisible) {
            return;
        }
        this.setVisible(false);
        if (this.scene) {
            if (typeof this.scene.releaseModalInputLock === 'function') {
                this.scene.releaseModalInputLock();
            } else if (this.scene.input) {
                this.scene.input.setTopOnly(false);
            }
        }
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
        if (this.bodyContainer) {
            this.bodyContainer.y = (this.titleText ? this.titleText.y : 0) + 36;
            this.populateBody(entry.points || []);
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
        if (this.isVisible && this.scene) {
            if (typeof this.scene.releaseModalInputLock === 'function') {
                this.scene.releaseModalInputLock();
            } else if (this.scene.input) {
                this.scene.input.setTopOnly(false);
            }
        }

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

        this.clearBodyContent();
        if (this.bodyContainer) {
            this.bodyContainer.destroy();
            this.bodyContainer = null;
        }

        destroyModal(this.modal);
        this.modal = null;
        this.backdrop = null;
        this.container = null;
        this.titleText = null;
        this.bodyEntries = [];
    }

    populateBody(points) {
        this.clearBodyContent();

        if (!Array.isArray(points) || points.length === 0) {
            return;
        }

        let currentY = 0;
        points.forEach((point) => {
            currentY = this.createBulletPoint(point, currentY);
        });
    }

    clearBodyContent() {
        this.bodyEntries.forEach((entry) => {
            if (entry && typeof entry.destroy === 'function') {
                entry.destroy();
            }
        });
        this.bodyEntries = [];
        if (this.bodyContainer) {
            this.bodyContainer.removeAll(false);
        }
    }

    createBulletPoint(point, startY) {
        const bulletX = -BODY_WIDTH / 2;
        const textStartX = bulletX + BULLET_INDENT;
        const maxLineWidth = BODY_WIDTH - BODY_PADDING;
        const lineHeight = BULLET_LINE_HEIGHT;
        const spacingAfter = BULLET_SPACING;

        const bullet = this.scene.add.text(bulletX, startY, '•', {
            fontSize: '20px',
            color: BULLET_COLOR,
            fontStyle: 'bold'
        }).setOrigin(0, 0);

        this.bodyContainer.add(bullet);
        this.bodyEntries.push(bullet);

        const tokens = this.combineTokens(this.createTokens(point));
        let cursorX = textStartX;
        let lineIndex = 0;

        tokens.forEach((token) => {
            if (!token.text) {
                return;
            }

            const isWhitespace = /^\s+$/.test(token.text);
            const tokenStyle = {
                fontSize: '20px',
                color: token.color || BODY_TEXT_COLOR,
                wordWrap: { width: maxLineWidth }
            };

            const measurement = this.scene.make.text({
                add: false,
                text: token.text,
                style: tokenStyle
            });
            const tokenWidth = measurement.width;
            measurement.destroy();

            if (!isWhitespace && cursorX > textStartX && cursorX - textStartX + tokenWidth > maxLineWidth) {
                cursorX = textStartX;
                lineIndex += 1;
            }

            if (cursorX === textStartX && isWhitespace) {
                return;
            }

            if (isWhitespace) {
                cursorX += tokenWidth;
                return;
            }

            const text = this.scene.add.text(cursorX, startY + lineIndex * lineHeight, token.text, tokenStyle)
                .setOrigin(0, 0);

            this.bodyContainer.add(text);
            this.bodyEntries.push(text);
            cursorX += tokenWidth;
        });

        return startY + (lineIndex + 1) * lineHeight + spacingAfter;
    }

    createTokens(point) {
        const baseColor = BODY_TEXT_COLOR;
        const text = point && point.text ? point.text : '';
        const highlights = Array.isArray(point && point.keywords) ? point.keywords : [];
        const segments = this.splitByKeywords(text, highlights, baseColor);
        const tokens = [];

        segments.forEach((segment) => {
            const color = segment.color || baseColor;
            const parts = segment.text.split(/(\s+)/);
            parts.forEach((part) => {
                if (part.length === 0) {
                    return;
                }
                tokens.push({ text: part, color });
            });
        });

        return tokens;
    }

    combineTokens(tokens) {
        if (!Array.isArray(tokens) || tokens.length === 0) {
            return [];
        }

        const combined = [];

        tokens.forEach((token) => {
            if (!token || typeof token.text !== 'string' || token.text.length === 0) {
                return;
            }

            const isWhitespace = /^\s+$/.test(token.text);
            const lastEntry = combined[combined.length - 1];

            if (!lastEntry) {
                if (isWhitespace) {
                    return;
                }
                combined.push({ text: token.text, color: token.color });
                return;
            }

            if (isWhitespace) {
                lastEntry.text += token.text;
                return;
            }

            if (lastEntry.color === token.color) {
                lastEntry.text += token.text;
                return;
            }

            combined.push({ text: token.text, color: token.color });
        });

        return combined;
    }

    splitByKeywords(text, keywords, baseColor) {
        if (!text) {
            return [{ text: '', color: baseColor }];
        }

        if (!Array.isArray(keywords) || keywords.length === 0) {
            return [{ text, color: baseColor }];
        }

        const normalizedKeywords = keywords
            .map((entry, idx) => {
                if (!entry || !entry.phrase) {
                    return null;
                }
                const phrase = entry.phrase;
                const index = text.indexOf(phrase);
                if (index === -1) {
                    return null;
                }
                return {
                    phrase,
                    index,
                    order: idx,
                    color: entry.color || KEYWORD_COLOR
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a.index - b.index) || (a.order - b.order));

        if (normalizedKeywords.length === 0) {
            return [{ text, color: baseColor }];
        }

        const segments = [];
        let cursor = 0;

        normalizedKeywords.forEach((keyword) => {
            const index = text.indexOf(keyword.phrase, cursor);
            if (index === -1) {
                return;
            }
            if (index > cursor) {
                segments.push({ text: text.slice(cursor, index), color: baseColor });
            }
            segments.push({ text: keyword.phrase, color: keyword.color });
            cursor = index + keyword.phrase.length;
        });

        if (cursor < text.length) {
            segments.push({ text: text.slice(cursor), color: baseColor });
        }

        return segments;
    }
}
