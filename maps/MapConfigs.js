import { SlapperEnemy } from '../enemies/Slapper.js';
import { HotfixEnemy } from '../enemies/Hotfix.js';
import { LockjawEnemy } from '../enemies/Lockjaw.js';
import { CounterlockEnemy } from '../enemies/Counterlock.js';
import { InfernoEnemy } from '../enemies/Inferno.js';
import { WallopEnemy } from '../enemies/Wallop.js';
import { WeakenerEnemy } from '../enemies/Weakener.js';
import { StraightArrowEnemy } from '../enemies/StraightArrow.js';
import { LockdownEnemy } from '../enemies/Lockdown.js';

const mapOneEnemyFactories = () => [
    new SlapperEnemy(),
    new HotfixEnemy(),
    new LockjawEnemy(),
    new CounterlockEnemy(),
    new InfernoEnemy()
];

const createMapOneEnemySequence = (randomSource = Math.random) => {
    const randomFn = typeof randomSource === 'function' ? randomSource : Math.random;
    const lockjawIndex = 2;
    const counterlockIndex = 3;
    const thirdEnemyIndex = randomFn() < 0.5 ? lockjawIndex : counterlockIndex;
    const fourthEnemyIndex = thirdEnemyIndex === lockjawIndex ? counterlockIndex : lockjawIndex;

    const sequence = [
        {
            enemyIndex: 0,
            rewardGold: 50,
            label: 'Battle',
            start: true
        },
        {
            enemyIndex: 1,
            rewardGold: 70,
            label: 'Battle'
        },
        {
            enemyIndex: thirdEnemyIndex,
            rewardGold: 90,
            label: 'Battle'
        }
    ];

    sequence.push({
        enemyIndex: fourthEnemyIndex,
        rewardGold: 100,
        label: 'Battle'
    });

    sequence.push({
        enemyIndex: 4,
        rewardGold: 150,
        label: 'Boss',
        isBoss: true
    });

    return sequence;
};

const mapTwoEnemyFactories = () => [
    new WallopEnemy(),
    new WeakenerEnemy(),
    new StraightArrowEnemy(),
    new InfernoEnemy(), // placeholder until new enemy idea
    new LockdownEnemy()
];

const mapTwoEnemySequence = [
    {
        enemyIndex: 0,
        rewardGold: 70,
        label: 'Battle',
        start: true
    },
    {
        enemyIndex: 1,
        rewardGold: 100,
        label: 'Battle'
    },
    {
        enemyIndex: 2,
        rewardGold: 130,
        label: 'Battle'
    },
    {
        enemyIndex: 3,
        rewardGold: 200,
        label: 'Boss',
        isBoss: true
    }
];

export const MAP_CONFIGS = [
    {
        id: 'map-1',
        displayName: 'Map 1: Molten Forge',
        createEnemies: mapOneEnemyFactories,
        createEnemySequence: () => createMapOneEnemySequence(),
        wallTextureKey: 'wall'
    },
    {
        id: 'map-2',
        displayName: 'Map 2: Iron Bastion',
        createEnemies: mapTwoEnemyFactories,
        enemySequence: mapTwoEnemySequence,
        pathTextureKey: 'path_ladder_metal',
        wallTextureKey: 'wall2'
    }
];
