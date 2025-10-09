export function createIroncladDie() {
    return {
        id: 'ironclad-die',
        name: 'Ironclad Die',
        description: 'A reinforced die that bolsters your vitality.',
        cost: 100,
        apply(scene) {
            if (!scene || typeof scene.modifyPlayerMaxHealth !== 'function') {
                return;
            }
            scene.modifyPlayerMaxHealth(5, { healCurrent: false });
        }
    };
}
