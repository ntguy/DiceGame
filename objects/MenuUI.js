import { COMBO_POINTS } from '../systems/ComboSystem.js';
import { createSidePanel } from './ui/SidePanelFactory.js';

export function createMenuUI(scene) {
    if (scene.menuPanel) {
        scene.menuPanel.destroy(true);
        scene.menuPanel = null;
    }

    const panel = createSidePanel(scene, {
        title: 'Menu',
        titleColor: '#f1c40f',
        closeLabel: 'Close Menu'
    });
    const { container: menuPanel, panelWidth, sectionWidth } = panel;

    const comboPoints = typeof scene.getComboPointsTable === 'function'
        ? scene.getComboPointsTable()
        : COMBO_POINTS;
    const combos = Object.entries(comboPoints);
    const lineSpacing = 24;
    const comboContentHeight = combos.length * lineSpacing;
    const comboSectionHeight = comboContentHeight + 60;
    const comboTop = 70;

    const comboBg = scene.add.rectangle(panelWidth / 2, comboTop + comboSectionHeight / 2, sectionWidth, comboSectionHeight, 0x1f2a38, 0.92)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xf1c40f, 0.18);
    menuPanel.add(comboBg);

    const comboTitle = scene.add.text(panelWidth / 2, comboTop + 16, 'Combo Bonuses', {
        fontSize: '32px',
        color: '#f9e79f',
        fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    menuPanel.add(comboTitle);

    const comboTextStartX = panelWidth / 2 + sectionWidth / 2 - 16;
    const comboTextStartY = comboTop + 52;
    scene.comboListOrder = combos.map(([combo]) => combo);

    scene.comboListTexts = combos.map(([combo, points], index) => {
        const text = scene.add.text(comboTextStartX, comboTextStartY + index * lineSpacing, `${combo}: ${points}`, {
            fontSize: '20px',
            color: '#ecf0f1'
        }).setOrigin(1, 0);
        menuPanel.add(text);
        return text;
    });

    scene.menuCloseButton = panel.closeButton;
    scene.menuCloseButton.on('pointerup', () => scene.closeMenu());

    menuPanel.setVisible(false);
    scene.menuPanel = menuPanel;
    scene.isMenuOpen = false;
    scene.updateMenuButtonLabel();
}
