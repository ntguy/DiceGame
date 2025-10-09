const DEFAULT_MODAL_CONFIG = {
    width: 720,
    height: 480,
    depth: 40,
    backdropAlpha: 0.55,
    panelColor: 0x1a1326,
    panelAlpha: 0.93,
    strokeColor: 0xf1c40f,
    strokeAlpha: 0.9,
    strokeWidth: 4,
    titleStyle: {
        fontSize: '36px',
        color: '#f1c40f',
        fontStyle: 'bold'
    },
    subtitleStyle: {
        fontSize: '20px',
        color: '#f9e79f'
    },
    titlePadding: 44,
    subtitleSpacing: 40
};

export function createModal(scene, config = {}) {
    const merged = {
        ...DEFAULT_MODAL_CONFIG,
        ...config,
        titleStyle: { ...DEFAULT_MODAL_CONFIG.titleStyle, ...(config.titleStyle || {}) },
        subtitleStyle: { ...DEFAULT_MODAL_CONFIG.subtitleStyle, ...(config.subtitleStyle || {}) }
    };

    const { width: sceneWidth, height: sceneHeight } = scene.scale;
    const centerX = sceneWidth / 2;
    const centerY = sceneHeight / 2;

    const depth = merged.depth;
    const backdrop = scene.add.rectangle(centerX, centerY, sceneWidth, sceneHeight, 0x000000, merged.backdropAlpha)
        .setDepth(depth - 2)
        .setInteractive({ useHandCursor: false });

    const container = scene.add.container(centerX, centerY);
    container.setDepth(depth);

    const panel = scene.add.rectangle(0, 0, merged.width, merged.height, merged.panelColor, merged.panelAlpha)
        .setStrokeStyle(merged.strokeWidth, merged.strokeColor, merged.strokeAlpha);

    container.add(panel);

    const panelTop = -merged.height / 2;

    let titleText = null;
    if (merged.title) {
        titleText = scene.add.text(0, panelTop + merged.titlePadding, merged.title, merged.titleStyle)
            .setOrigin(0.5, 0.5);
        container.add(titleText);
    }

    let subtitleText = null;
    if (merged.subtitle) {
        const subtitleY = titleText
            ? titleText.y + merged.subtitleSpacing
            : panelTop + merged.titlePadding + merged.subtitleSpacing;
        subtitleText = scene.add.text(0, subtitleY, merged.subtitle, merged.subtitleStyle)
            .setOrigin(0.5, 0.5);
        container.add(subtitleText);
    }

    return { backdrop, container, panel, titleText, subtitleText };
}

export function destroyModal(modal) {
    if (!modal) {
        return;
    }

    if (modal.backdrop) {
        modal.backdrop.destroy();
        modal.backdrop = null;
    }

    if (modal.container) {
        modal.container.destroy(true);
        modal.container = null;
    }
}

export function createCard(scene, {
    width,
    height,
    backgroundColor = 0x120a1a,
    backgroundAlpha = 0.92,
    strokeColor = 0xf1c40f,
    strokeAlpha = 0.85,
    strokeWidth = 2
} = {}) {
    const container = scene.add.container(0, 0);
    const background = scene.add.rectangle(0, 0, width, height, backgroundColor, backgroundAlpha)
        .setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);

    container.add(background);

    return { container, background };
}
