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
import { CompactorEnemy } from '../enemies/Compactor.js';
import { StatusTicianEnemy } from '../enemies/StatusTician.js';
import { DIFFICULTY_PRESETS } from '../DifficultyConfig.js';

const normalDifficulty = DIFFICULTY_PRESETS?.normal ?? {};
const normalRewards = normalDifficulty.mapRewards ?? {};
const mapOneNormalRewards = Array.isArray(normalRewards['map-1'])
    ? normalRewards['map-1']
    : [50, 70, 90, 100, 150];
const mapTwoNormalRewards = Array.isArray(normalRewards['map-2'])
    ? normalRewards['map-2']
    : [70, 100, 120, 150, 200];
const mapThreeNormalRewards = Array.isArray(normalRewards['map-3'])
    ? normalRewards['map-3']
    : [80, 110, 150, 180, 300];

const mapOneEnemyFactories = () => [
    new SlapperEnemy(),
    new HotfixEnemy(),
    new LockjawEnemy(),
    new CounterlockEnemy(),
    new InfernoEnemy()
];

const createMapOneEnemySequence = (randomSource = Math.random, options = {}) => {
    const randomFn = typeof randomSource === 'function' ? randomSource : Math.random;
    const lockjawIndex = 2;
    const counterlockIndex = 3;
    const thirdEnemyIndex = randomFn() < 0.5 ? lockjawIndex : counterlockIndex;
    const fourthEnemyIndex = thirdEnemyIndex === lockjawIndex ? counterlockIndex : lockjawIndex;

    const sequence = [
        {
            enemyIndex: 0,
            rewardGold: mapOneNormalRewards[0] ?? 50,
            label: 'Battle',
            start: true
        },
        {
            enemyIndex: 1,
            rewardGold: mapOneNormalRewards[1] ?? 70,
            label: 'Battle'
        },
        {
            enemyIndex: thirdEnemyIndex,
            rewardGold: mapOneNormalRewards[2] ?? 90,
            label: 'Battle'
        }
    ];

    sequence.push({
        enemyIndex: fourthEnemyIndex,
        rewardGold: mapOneNormalRewards[3] ?? 100,
        label: 'Battle'
    });

    sequence.push({
        enemyIndex: 4,
        rewardGold: mapOneNormalRewards[4] ?? 150,
        label: 'Boss',
        isBoss: true
    });

    return sequence;
};

const mapTwoEnemyFactories = () => [
    new WallopEnemy(),
    new WeakenerEnemy(),
    new StraightArrowEnemy(),
    new LeechEnemy(), // placeholder
    new LockdownEnemy()
];

const createMapTwoEnemySequence = (options = {}) => [
    {
        enemyIndex: 0,
        rewardGold: mapTwoNormalRewards[0] ?? 70,
        label: 'Battle',
        start: true
    },
    {
        enemyIndex: 1,
        rewardGold: mapTwoNormalRewards[1] ?? 100,
        label: 'Battle'
    },
    {
        enemyIndex: 2,
        rewardGold: mapTwoNormalRewards[2] ?? 120,
        label: 'Battle'
    },
    {
        enemyIndex: 3,
        rewardGold: mapTwoNormalRewards[3] ?? 150,
        label: 'Battle'
    },
    {
        enemyIndex: 4,
        rewardGold: mapTwoNormalRewards[4] ?? 200,
        label: 'Boss',
        isBoss: true
    }
];

const mapThreeEnemyFactories = () => [
    new LeechEnemy(),
    new AuditorEnemy(),
    new CompactorEnemy(),
    new LockdownEnemy(), // placeholder
    new StatusTicianEnemy()
];

const createMapThreeEnemySequence = (options = {}) => [
    {
        enemyIndex: 0,
        rewardGold: mapThreeNormalRewards[0] ?? 80,
        label: 'Battle',
        start: true
    },
    {
        enemyIndex: 1,
        rewardGold: mapThreeNormalRewards[1] ?? 110,
        label: 'Battle'
    },
    {
        enemyIndex: 2,
        rewardGold: mapThreeNormalRewards[2] ?? 150,
        label: 'Battle'
    },
    {
        enemyIndex: 3,
        rewardGold: mapThreeNormalRewards[3] ?? 180,
        label: 'Battle'
    },
    {
        enemyIndex: 4,
        rewardGold: mapThreeNormalRewards[4] ?? 300,
        label: 'Boss',
        isBoss: true
    }
];

export const MAP_CONFIGS = [
    {
        id: 'map-1',
        displayName: 'Map 1: Twilight Tumble',
        createEnemies: mapOneEnemyFactories,
        createEnemySequence: options => createMapOneEnemySequence(undefined, options),
        pathTextureKey: 'path_ladder_clean',
        wallTextureKey: 'wall2',
        backgroundTextureKey: 'path_background',
        musicKey: 'Map1Music',
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
        createEnemySequence: options => createMapTwoEnemySequence(options),
        pathTextureKey: 'path_ladder_metal',
        wallTextureKey: 'wall',
        backgroundTextureKey: 'path_background_brightest',
        musicKey: 'Map2Music',
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
        displayName: 'Map 3: Azure Abyss',
        createEnemies: mapThreeEnemyFactories,
        createEnemySequence: options => createMapThreeEnemySequence(options),
        pathTextureKey: 'path_ladder',
        wallTextureKey: 'wall2',
        backgroundTextureKey: 'path_background_bright',
        musicKey: 'Map3Music',
        outsideBackgroundLayerKeys: [
            'outside_background_world3_1',
            'outside_background_world3_2',
            'outside_background_world3_3',
            'outside_background_world3_4',
            'outside_background_world3_5',
            'outside_background_world3_6',
            'outside_background_world3_7',
            'outside_background_world3_8',
            'outside_background_world3_9'
        ],
        outsideBackgroundEffect: 'bats'
    }
];
