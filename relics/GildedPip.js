export function createGildedPip() {
    return {
        id: 'gilded-pip',
        name: 'Gilded Pip',
        description: 'A lucky pip said to extend one\'s life force.',
        cost: 100,
        apply(scene) {
            if (!scene || typeof scene.modifyPlayerMaxHealth !== 'function') {
                return;
            }
            scene.modifyPlayerMaxHealth(5, { healCurrent: false });
        }
    };
}
