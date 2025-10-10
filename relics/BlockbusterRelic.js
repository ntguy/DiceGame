import { Relic } from './RelicBase.js';

export class BlockbusterRelic extends Relic {
    constructor() {
        super({
            id: 'blockbuster',
            name: 'Blockbuster',
            description: 'Deal double damage to enemy block.',
            icon: '🎬'
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasBlockbusterRelic = true;
        scene.blockDamageMultiplier = 2;

        if (scene.enemyManager && typeof scene.enemyManager.setBlockDamageMultiplier === 'function') {
            scene.enemyManager.setBlockDamageMultiplier(scene.blockDamageMultiplier);
        }
    }
}
