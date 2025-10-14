import { Relic } from './RelicBase.js';
export class BlockbusterRelic extends Relic {
    constructor() {
        super({
            id: 'blockbuster',
            name: 'Blockbuster',
            description: 'Your attacks deal double damage to enemy block.',
            icon: '🎬',
            cost: 150
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasBlockbusterRelic = true;
    }
}
