import { Relic } from './RelicBase.js';

export class WildOneRelic extends Relic {
    constructor() {
        super({
            id: 'wild-one',
            name: 'Wild One',
            description: '1s act as wildcards during combo evaluation.',
            icon: '🃏',
            cost: 140
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasWildOneRelic = true;
    }
}
