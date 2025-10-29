import { BlockbusterRelic } from './BlockbusterRelic.js';
import { BeefyRelic } from './BeefyRelic.js';
import { FamilyRelic } from './FamilyRelic.js';
import { ReRollWithItRelic } from './ReRollWithItRelic.js';
import { WildOneRelic } from './WildOneRelic.js';
import { StraightSudsRelic } from './StraightSudsRelic.js';
import { RainRelic } from './RainRelic.js';
import { PrepperRelic } from './PrepperRelic.js';

export const RELIC_POOL_KEYS = {
    GENERAL: 'general',
    BOSS: 'boss'
};

const RELIC_POOL_DEFINITIONS = [
    { create: () => new BlockbusterRelic(), pools: [RELIC_POOL_KEYS.GENERAL, RELIC_POOL_KEYS.BOSS] },
    { create: () => new BeefyRelic(), pools: [RELIC_POOL_KEYS.GENERAL, RELIC_POOL_KEYS.BOSS] },
    { create: () => new FamilyRelic(), pools: [RELIC_POOL_KEYS.GENERAL, RELIC_POOL_KEYS.BOSS] },
    { create: () => new ReRollWithItRelic(), pools: [RELIC_POOL_KEYS.GENERAL, RELIC_POOL_KEYS.BOSS] },
    { create: () => new WildOneRelic(), pools: [RELIC_POOL_KEYS.GENERAL, RELIC_POOL_KEYS.BOSS] },
    { create: () => new StraightSudsRelic(), pools: [RELIC_POOL_KEYS.GENERAL, RELIC_POOL_KEYS.BOSS] },
    { create: () => new RainRelic(), pools: [RELIC_POOL_KEYS.GENERAL, RELIC_POOL_KEYS.BOSS] },
    { create: () => new PrepperRelic(), pools: [RELIC_POOL_KEYS.GENERAL, RELIC_POOL_KEYS.BOSS] }
];

function createEmptyPools() {
    return {
        [RELIC_POOL_KEYS.GENERAL]: [],
        [RELIC_POOL_KEYS.BOSS]: []
    };
}

export function createRelicPools() {
    const pools = createEmptyPools();

    RELIC_POOL_DEFINITIONS.forEach(definition => {
        if (!definition || typeof definition.create !== 'function' || !Array.isArray(definition.pools)) {
            return;
        }

        definition.pools.forEach(poolKey => {
            if (!pools[poolKey]) {
                pools[poolKey] = [];
            }

            const relic = definition.create();
            if (relic) {
                pools[poolKey].push(relic);
            }
        });
    });

    return pools;
}

