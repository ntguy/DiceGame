import { Relic } from './RelicBase.js';

export class RainRelic extends Relic {
    constructor() {
        super({
            id: 'rain',
            name: 'Rain',
            description: 'Reduce your burn by 1 at the start of each turn.',
            icon: '🌧️',
            cost: 100
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasRainRelic = true;
        const currentReduction = typeof scene.playerBurnReductionPerTurn === 'number'
            ? scene.playerBurnReductionPerTurn
            : 0;
        scene.playerBurnReductionPerTurn = Math.max(currentReduction, 1);
    }
}
