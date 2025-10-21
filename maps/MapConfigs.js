import { SlapperEnemy } from '../enemies/Slapper.js';
import { HotfixEnemy } from '../enemies/Hotfix.js';
import { LockjawEnemy } from '../enemies/Lockjaw.js';
import { CounterlockEnemy } from '../enemies/Counterlock.js';
import { InfernoEnemy } from '../enemies/Inferno.js';
import { WallopEnemy } from '../enemies/Wallop.js';
import { WeakenerEnemy } from '../enemies/Weakener.js';
import { StraightArrowEnemy } from '../enemies/StraightArrow.js';
import { LockdownEnemy } from '../enemies/Lockdown.js';
import { LeechEnemy } from '../enemies/Leech.js';
import { AuditorEnemy } from '../enemies/Auditor.js';

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
    new InfernoEnemy(), // placeholder
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
        rewardGold: 140,
        label: 'Battle'
    },
    {
        enemyIndex: 3,
        rewardGold: 220,
        label: 'Boss',
        isBoss: true
    }
];

const mapThreeEnemyFactories = () => [
    new LeechEnemy(),
    new AuditorEnemy(),
    new InfernoEnemy(), // placeholder
    new LockdownEnemy(), // placeholder
    new LockdownEnemy() // placeholder
];

const mapThreeEnemySequence = [
    {
        enemyIndex: 0,
        rewardGold: 90,
        label: 'Battle',
        start: true
    },
    {
        enemyIndex: 1,
        rewardGold: 130,
        label: 'Battle'
    },
    {
        enemyIndex: 2,
        rewardGold: 170,
        label: 'Battle'
    },
    {
        enemyIndex: 3,
        rewardGold: 210,
        label: 'Battle'
    },
    {
        enemyIndex: 4,
        rewardGold: 260,
        label: 'Battle'
    },
    {
        enemyIndex: 5,
        rewardGold: 320,
        label: 'Boss',
        isBoss: true
    }
];

export const MAP_CONFIGS = [
    {
        id: 'map-1',
        displayName: 'Map 1: Twilight Tumble',
        createEnemies: mapOneEnemyFactories,
        createEnemySequence: () => createMapOneEnemySequence(),
        pathTextureKey: 'path_ladder_clean',
        wallTextureKey: 'wall2',
        backgroundTextureKey: 'path_background_bright',
        outsideBackgroundLayerKeys: [
            'outside_background_1',
            'outside_background_2',
            'outside_background_3',
            'outside_background_4'
        ]
    },
    {
        id: 'map-2',
        displayName: 'Map 2: Cloudfall Court',
        createEnemies: mapTwoEnemyFactories,
        enemySequence: mapTwoEnemySequence,
        pathTextureKey: 'path_ladder_metal',
        wallTextureKey: 'wall',
        backgroundTextureKey: 'path_background_brightest',
        outsideBackgroundLayerKeys: [
            'outside_background_world2_1',
            'outside_background_world2_2',
            'outside_background_world2_3',
            'outside_background_world2_4'
        ],
        outsideBackgroundEffect: 'birds'
    },
    {
        id: 'map-3',
        displayName: 'Map 3: Sanguine Depths',
        createEnemies: mapThreeEnemyFactories,
        enemySequence: mapThreeEnemySequence,
        pathTextureKey: 'path_ladder',
        wallTextureKey: 'wall2',
        backgroundTextureKey: 'path_background',
        outsideBackgroundLayerKeys: [
            'outside_background_1',
            'outside_background_2',
            'outside_background_3',
            'outside_background_4'
        ]
    }
];
