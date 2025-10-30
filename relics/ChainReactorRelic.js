import { Relic } from './RelicBase.js';

export class ChainReactorRelic extends Relic {
    constructor() {
        super({
            id: 'chain-reactor',
            name: 'Chain Reactor',
            description: 'Combo bonuses are significantly increased.',
            icon: '⛓️',
            cost: 160
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasChainReactorRelic = true;
    }
}
