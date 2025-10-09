export function createStoneWard() {
    return {
        id: 'stone-ward',
        name: 'Stone Ward',
        description: 'A rugged charm that hardens the spirit.',
        cost: 100,
        apply(scene) {
            if (!scene || typeof scene.modifyPlayerMaxHealth !== 'function') {
                return;
            }
            scene.modifyPlayerMaxHealth(5, { healCurrent: false });
        }
    };
}
