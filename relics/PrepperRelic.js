import { Relic } from './RelicBase.js';

export class PrepperRelic extends Relic {
    constructor() {
        super({
            id: 'prepper',
            name: 'Prepper',
            description: 'Spare rolls carry over between turns. +1 roll on first turn.',
            icon: '🧻',
            cost: 100
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.rollCarryoverEnabled = true;
        scene.prepperFirstTurnBonusRolls = 1;
    }
}
