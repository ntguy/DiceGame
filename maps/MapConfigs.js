import { SlapperEnemy } from '../enemies/Slapper.js';
import { HotfixEnemy } from '../enemies/Hotfix.js';
import { LockjawEnemy } from '../enemies/Lockjaw.js';
import { InfernoEnemy } from '../enemies/Inferno.js';
import { WallopEnemy } from '../enemies/Wallop.js';
import { DEFAULT_PATH_ENEMY_SEQUENCE } from '../systems/PathManager.js';
import { WeakenerEnemy } from '../enemies/Weakener.js';
import { StraightArrowEnemy } from '../enemies/StraightArrow.js';
import { LockdownEnemy } from '../enemies/Lockdown.js';

const mapOneEnemyFactories = () => [
    new SlapperEnemy(),
    new HotfixEnemy(),
    new LockjawEnemy(),
    new InfernoEnemy()
];

const mapTwoEnemyFactories = () => [
    new WallopEnemy(),
    new WeakenerEnemy(),
    new StraightArrowEnemy(),
    new LockdownEnemy()
];

const mapTwoEnemySequence = [
    {
        enemyIndex: 0,
        rewardGold: 80,
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

export const MAP_CONFIGS = [
    {
        id: 'map-1',
        displayName: 'Map 1: Molten Forge',
        createEnemies: mapOneEnemyFactories,
        enemySequence: DEFAULT_PATH_ENEMY_SEQUENCE
    },
    {
        id: 'map-2',
        displayName: 'Map 2: Iron Bastion',
        createEnemies: mapTwoEnemyFactories,
        enemySequence: mapTwoEnemySequence,
        pathTextureKey: 'path_ladder_clean'
    }
];
