import { BlockbusterRelic } from './BlockbusterRelic.js';
import { BeefyRelic } from './BeefyRelic.js';
import { FamilyRelic } from './FamilyRelic.js';
import { ReRollWithItRelic } from './ReRollWithItRelic.js';
import { WildOneRelic } from './WildOneRelic.js';
import { StraightSudsRelic } from './StraightSudsRelic.js';
import { RainRelic } from './RainRelic.js';
import { PrepperRelic } from './PrepperRelic.js';

const POOL_KEYS = {
    GENERAL: 'general',
    BOSS: 'boss'
};

const RELIC_POOL_CONFIG = [
    { create: () => new BlockbusterRelic(), pools: [POOL_KEYS.GENERAL, POOL_KEYS.BOSS] },
    { create: () => new BeefyRelic(), pools: [POOL_KEYS.GENERAL, POOL_KEYS.BOSS] },
    { create: () => new FamilyRelic(), pools: [POOL_KEYS.GENERAL, POOL_KEYS.BOSS] },
    { create: () => new ReRollWithItRelic(), pools: [POOL_KEYS.GENERAL, POOL_KEYS.BOSS] },
    { create: () => new WildOneRelic(), pools: [POOL_KEYS.GENERAL, POOL_KEYS.BOSS] },
    { create: () => new StraightSudsRelic(), pools: [POOL_KEYS.GENERAL, POOL_KEYS.BOSS] },
    { create: () => new RainRelic(), pools: [POOL_KEYS.GENERAL, POOL_KEYS.BOSS] },
    { create: () => new PrepperRelic(), pools: [POOL_KEYS.GENERAL, POOL_KEYS.BOSS] }
];

export function createRelicPools() {
    const general = [];
    const boss = [];

    RELIC_POOL_CONFIG.forEach(entry => {
        if (!entry || typeof entry.create !== 'function' || !Array.isArray(entry.pools)) {
            return;
        }

        const pools = entry.pools.map(pool => pool || '').filter(Boolean);
        if (pools.length === 0) {
            return;
        }

        const participatesInGeneral = pools.includes(POOL_KEYS.GENERAL);
        const participatesInBoss = pools.includes(POOL_KEYS.BOSS);

        let sharedInstance = null;
        if (participatesInGeneral) {
            sharedInstance = entry.create();
            if (sharedInstance) {
                general.push(sharedInstance);
            }
        }

        if (participatesInBoss) {
            const bossInstance = participatesInGeneral && sharedInstance
                ? sharedInstance
                : entry.create();
            if (bossInstance) {
                boss.push(bossInstance);
            }
        }
    });

    return { general, boss };
}

export { POOL_KEYS as RELIC_POOL_KEYS };
