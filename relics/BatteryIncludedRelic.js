import { Relic } from './RelicBase.js';

export class BatteryIncludedRelic extends Relic {
    constructor() {
        super({
            id: 'battery-included',
            name: 'Battery Included',
            description: 'Gain an extra standard die with 3 uses each battle.',
            icon: '🔋',
            cost: 170
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasBatteryIncludedRelic = true;
        const uses = 3;
        const currentMax = Number.isFinite(scene.batteryDieUsesPerBattle)
            ? scene.batteryDieUsesPerBattle
            : 0;
        scene.batteryDieUsesPerBattle = Math.max(currentMax, uses);
    }
}
