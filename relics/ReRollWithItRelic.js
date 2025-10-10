import { Relic } from './RelicBase.js';

export class ReRollWithItRelic extends Relic {
    constructor() {
        super({
            id: 'reroll-with-it',
            name: 'Re-Roll with it',
            description: 'Gain 1 Defense per dice re-rolled.',
            icon: '🎲',
            cost: 90
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.rerollDefensePerDie = (scene.rerollDefensePerDie || 0) + 1;
    }
}
