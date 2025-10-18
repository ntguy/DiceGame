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

const mapOneEnemySequence = [
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
        enemyIndex: 2,
        rewardGold: 100,
        label: 'Battle'
    },
    {
        enemyIndex: 3,
        rewardGold: 120,
        label: 'Battle'
    },
    {
        enemyIndex: 4,
        rewardGold: 150,
        label: 'Boss',
        isBoss: true
    }
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
        enemySequence: mapOneEnemySequence
    },
    {
        id: 'map-2',
        displayName: 'Map 2: Iron Bastion',
        createEnemies: mapTwoEnemyFactories,
        enemySequence: mapTwoEnemySequence
    }
];
