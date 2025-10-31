import { CONSTANTS } from '../../config.js';
import { applyRectangleButtonStyle } from './ButtonStyles.js';
import { createBitmapText } from '../../utils/BitmapTextLabel.js';

const DEFAULT_PANEL_BACKGROUND = 0x101820;
const DEFAULT_PANEL_STROKE_ALPHA = 0.08;
const DEFAULT_PANEL_ALPHA = 0.95;
const PANEL_CLOSE_BUTTON_COLOR = 0x2d1b3d;

export function createSidePanel(scene, {
    title,
    titleColor,
    closeLabel,
    closeTextColor = '#f9e79f'
}) {
    const panelWidth = scene.scale.width * 0.28;
    const panelHeight = scene.scale.height - CONSTANTS.HEADER_HEIGHT;
    const panelX = scene.scale.width - panelWidth;
    const padding = 24;
    const sectionWidth = panelWidth - padding * 2;

    const container = scene.add.container(panelX, 0);
    container.setDepth(80);

    const background = scene.add.rectangle(
        panelWidth / 2,
        panelHeight / 2,
        panelWidth,
        panelHeight,
        DEFAULT_PANEL_BACKGROUND,
        DEFAULT_PANEL_ALPHA
    ).setOrigin(0.5)
        .setStrokeStyle(2, 0xffffff, DEFAULT_PANEL_STROKE_ALPHA)
        .setInteractive();

    container.add(background);

    const headerText = createBitmapText(scene, panelWidth / 2, 24, title, {
        fontSize: '32px',
        color: titleColor,
        fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    container.add(headerText);

    const closeButtonHeight = 58;
    const closeButtonMargin = 32;
    const closeButtonY = panelHeight - closeButtonMargin - closeButtonHeight / 2;

    const closeButton = scene.add.rectangle(
        panelWidth / 2,
        closeButtonY,
        sectionWidth,
        closeButtonHeight,
        PANEL_CLOSE_BUTTON_COLOR,
        DEFAULT_PANEL_ALPHA
    ).setInteractive({ useHandCursor: true });

    applyRectangleButtonStyle(closeButton, {
        baseColor: PANEL_CLOSE_BUTTON_COLOR,
        baseAlpha: DEFAULT_PANEL_ALPHA,
        hoverBlend: 0.18,
        pressBlend: 0.32,
        disabledBlend: 0.5,
        enabledAlpha: 1,
        disabledAlpha: 0.45
    });

    container.add(closeButton);

    const closeText = createBitmapText(scene, panelWidth / 2, closeButtonY, closeLabel, {
        fontSize: '24px',
        color: closeTextColor
    }).setOrigin(0.5);
    container.add(closeText);

    return {
        container,
        background,
        closeButton,
        closeText,
        panelWidth,
        panelHeight,
        padding,
        sectionWidth,
        destroy() {
            container.destroy(true);
        }
    };
}
