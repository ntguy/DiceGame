const NODE_TYPES = {
    ENEMY: 'enemy',
    SHOP: 'shop',
    INFIRMARY: 'infirmary',
    TOWER: 'tower',
    UPGRADE: 'upgrade'
};

const DEFAULT_MIN_REGULAR_ENEMIES = 2;
const DEFAULT_MAX_REGULAR_ENEMIES = 4;
const MAX_BRANCHES = 2;
const BRANCH_COLUMNS = {
    left: 0,
    center: 1,
    right: 2
};

const DEFAULT_ENEMY_SEQUENCE = [
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
        rewardGold: 150,
        label: 'Boss',
        isBoss: true
    }
];

export class PathManager {
    constructor({
        enemySequence,
        allowUpgradeNodes = false,
        upgradeNodeMinEnemyIndex = 1,
        minRegularEnemies = DEFAULT_MIN_REGULAR_ENEMIES,
        maxRegularEnemies = DEFAULT_MAX_REGULAR_ENEMIES
    } = {}, randomSource = Math.random) {
        this.randomFn = typeof randomSource === 'function' ? randomSource : Math.random;
        this.nodes = [];
        this.nodeMap = new Map();
        this.currentNodeId = null;
        this.completedNodeIds = new Set();
        this.previousFrontier = [];
        this.enemySequence = Array.isArray(enemySequence) && enemySequence.length > 0
            ? enemySequence.map(entry => ({ ...entry }))
            : DEFAULT_ENEMY_SEQUENCE.map(entry => ({ ...entry }));
        this.allowUpgradeNodes = !!allowUpgradeNodes;
        this.upgradeNodeMinEnemyIndex = Number.isFinite(upgradeNodeMinEnemyIndex)
            ? Math.max(0, upgradeNodeMinEnemyIndex)
            : 1;
        this.minRegularEnemies = Number.isFinite(minRegularEnemies)
            ? Math.max(1, Math.floor(minRegularEnemies))
            : DEFAULT_MIN_REGULAR_ENEMIES;
        this.maxRegularEnemies = Number.isFinite(maxRegularEnemies)
            ? Math.max(this.minRegularEnemies, Math.floor(maxRegularEnemies))
            : Math.max(this.minRegularEnemies, DEFAULT_MAX_REGULAR_ENEMIES);

        this.enemySequence = this.buildEnemySequenceWithVariance(this.enemySequence);
        this.generatePath();

        this.frontier = this.nodes.filter(node => node.start).map(node => node.id);
        if (this.frontier.length === 0 && this.nodes.length > 0) {
            this.frontier = [this.nodes[0].id];
        }
    }

    getFacilityTypesForEnemyIndex(enemyIndex) {
        const facilityTypes = [NODE_TYPES.SHOP, NODE_TYPES.INFIRMARY, NODE_TYPES.TOWER];

        if (this.allowUpgradeNodes && enemyIndex >= this.upgradeNodeMinEnemyIndex) {
            facilityTypes.push(NODE_TYPES.UPGRADE);
        }

        return facilityTypes;
    }

    generatePath() {
        this.nodes = [];
        this.nodeMap.clear();

        let currentRow = 0;
        let branchStates = [
            { key: 'center', column: BRANCH_COLUMNS.center, incoming: [] }
        ];

        this.enemySequence.forEach((enemyData, index) => {
            const isLastEnemy = index === this.enemySequence.length - 1;
            const nextEnemyIsBoss = (index + 1) === this.enemySequence.length - 1;

            const enemyNodesByBranch = new Map();

            branchStates.forEach((branchState, branchIndex) => {
                const branchKey = branchState.key;
                const enemyId = this.getEnemyNodeId(index, branchKey, isLastEnemy);
                const enemyNode = {
                    id: enemyId,
                    type: NODE_TYPES.ENEMY,
                    label: enemyData.label || (enemyData.isBoss ? 'Boss' : 'Battle'),
                    enemyIndex: enemyData.enemyIndex,
                    connections: [],
                    row: currentRow,
                    column: this.getEnemyColumn(branchKey, branchIndex, branchStates.length),
                    rewardGold: enemyData.rewardGold,
                    isBoss: !!enemyData.isBoss,
                    start: index === 0 && branchKey === 'center'
                };

                this.addNode(enemyNode);
                enemyNodesByBranch.set(branchKey, enemyNode);

                (branchState.incoming || []).forEach(previousNodeId => {
                    const previousNode = this.nodeMap.get(previousNodeId);
                    if (previousNode && Array.isArray(previousNode.connections) && !previousNode.connections.includes(enemyId)) {
                        previousNode.connections.push(enemyId);
                    }
                });
            });

            if (isLastEnemy) {
                return;
            }

            const transition = this.determineBranchTransition(branchStates, index, this.enemySequence.length - 1);
            const facilityRow = currentRow + 1;
            const nextBranchMap = new Map();
            transition.nextKeys.forEach(key => {
                const normalizedKey = key || 'center';
                nextBranchMap.set(normalizedKey, {
                    key: normalizedKey,
                    column: BRANCH_COLUMNS[normalizedKey] ?? BRANCH_COLUMNS.center,
                    incoming: []
                });
            });

            branchStates.forEach(branchState => {
                const branchKey = branchState.key;
                const enemyNode = enemyNodesByBranch.get(branchKey);
                if (!enemyNode) {
                    return;
                }

                const facilityTypes = this.chooseFacilityTypes(index, branchState, transition);
                const facilityColumns = this.getFacilityColumns(enemyNode.column, facilityTypes.length);

                facilityTypes.forEach((type, facilityIndex) => {
                    const facilityId = this.getFacilityNodeId(type, index, branchKey, facilityIndex);
                    const facilityNode = {
                        id: facilityId,
                        type,
                        label: this.getFacilityLabel(type),
                        connections: [],
                        row: facilityRow,
                        column: facilityColumns[facilityIndex] ?? enemyNode.column
                    };

                    const targetBranchKey = this.assignFacilityBranchKey(branchKey, facilityIndex, facilityTypes.length, transition);
                    const normalizedTargetKey = transition.nextKeys.includes(targetBranchKey)
                        ? targetBranchKey
                        : (transition.nextKeys[0] || 'center');
                    const nextBranchState = nextBranchMap.get(normalizedTargetKey);

                    const nextEnemyId = this.getEnemyNodeId(index + 1, normalizedTargetKey, nextEnemyIsBoss);
                    facilityNode.connections.push(nextEnemyId);

                    this.addNode(facilityNode);
                    enemyNode.connections.push(facilityId);

                    if (nextBranchState) {
                        nextBranchState.incoming.push(facilityId);
                    }
                });
            });

            branchStates = Array.from(nextBranchMap.values()).filter(branch => branch.incoming.length > 0).slice(0, MAX_BRANCHES);
            currentRow = facilityRow + 1;
        });
    }

    buildEnemySequenceWithVariance(sequence) {
        if (!Array.isArray(sequence) || sequence.length === 0) {
            return DEFAULT_ENEMY_SEQUENCE.map(entry => ({ ...entry }));
        }

        const entries = sequence.map(entry => ({ ...entry }));
        let bossEntryIndex = entries.findIndex(entry => entry.isBoss);
        if (bossEntryIndex < 0 && entries.length > 0) {
            bossEntryIndex = entries.length - 1;
            entries[bossEntryIndex].isBoss = true;
        }

        const bossEntry = bossEntryIndex >= 0 ? entries.splice(bossEntryIndex, 1)[0] : null;
        const regularEntries = entries.filter(entry => !entry.isBoss);

        const minRegulars = Math.min(this.minRegularEnemies, this.maxRegularEnemies);
        const maxRegulars = Math.max(this.minRegularEnemies, this.maxRegularEnemies);
        const availableRegulars = regularEntries.length > 0 ? regularEntries : DEFAULT_ENEMY_SEQUENCE.filter(entry => !entry.isBoss);
        const desiredRegularCount = this.randomInt(minRegulars, maxRegulars);

        const selectedRegulars = [];
        for (let i = 0; i < desiredRegularCount; i += 1) {
            const templateIndex = i < availableRegulars.length
                ? i
                : Math.floor(this.randomFn() * availableRegulars.length);
            const template = availableRegulars[Math.max(0, templateIndex)] || DEFAULT_ENEMY_SEQUENCE[0];
            selectedRegulars.push({
                ...template,
                start: i === 0,
                isBoss: false
            });
        }

        const finalBossEntry = bossEntry ? { ...bossEntry, start: false, isBoss: true } : {
            ...DEFAULT_ENEMY_SEQUENCE[DEFAULT_ENEMY_SEQUENCE.length - 1],
            isBoss: true,
            start: false
        };

        const finalSequence = selectedRegulars.concat(finalBossEntry);
        if (finalSequence.length > 0) {
            finalSequence[0].start = true;
        }

        return finalSequence;
    }

    randomInt(min, max) {
        const lower = Math.min(min, max);
        const upper = Math.max(min, max);
        const value = this.randomFn();
        return Math.floor(value * (upper - lower + 1)) + lower;
    }

    getEnemyNodeId(index, branchKey, isBoss) {
        if (isBoss) {
            return `enemy-${index}-boss`;
        }
        const normalizedKey = branchKey || 'center';
        return `enemy-${index}-${normalizedKey}`;
    }

    getEnemyColumn(branchKey, branchIndex, branchCount) {
        if (Object.prototype.hasOwnProperty.call(BRANCH_COLUMNS, branchKey)) {
            return BRANCH_COLUMNS[branchKey];
        }

        if (branchCount <= 1) {
            return BRANCH_COLUMNS.center;
        }

        const offset = branchIndex === 0 ? -1 : 1;
        return BRANCH_COLUMNS.center + offset;
    }

    determineBranchTransition(branchStates, stageIndex, totalRegularStages) {
        const keys = branchStates.map(state => state.key);
        const isPenultimateStage = stageIndex >= totalRegularStages - 1;

        if (isPenultimateStage) {
            return { type: 'merge', nextKeys: ['center'] };
        }

        if (keys.length === 1 && keys[0] === 'center') {
            const shouldSplit = this.randomFn() < 0.6;
            if (shouldSplit) {
                return { type: 'split', nextKeys: ['left', 'right'] };
            }
            return { type: 'maintain', nextKeys: ['center'] };
        }

        if (keys.length > 1) {
            const shouldMerge = this.randomFn() < 0.35;
            if (shouldMerge) {
                return { type: 'merge', nextKeys: ['center'] };
            }
            return { type: 'maintain', nextKeys: ['left', 'right'] };
        }

        return { type: 'maintain', nextKeys: ['center'] };
    }

    chooseFacilityTypes(enemyIndex, branchState, transition) {
        const facilityPool = this.getFacilityTypesForEnemyIndex(enemyIndex);
        const available = facilityPool.length > 0 ? facilityPool : [NODE_TYPES.SHOP];

        const requiresSplit = transition.type === 'split' && branchState.key === 'center';
        const minCount = requiresSplit ? 2 : 1;
        const maxCount = Math.min(available.length, requiresSplit ? 3 : 2);
        const targetCount = Math.max(minCount, maxCount);

        const selected = [];
        const pool = available.slice();
        while (selected.length < targetCount) {
            if (pool.length === 0) {
                selected.push(available[0]);
                continue;
            }
            const index = Math.floor(this.randomFn() * pool.length);
            selected.push(pool.splice(index, 1)[0]);
        }

        return selected;
    }

    getFacilityColumns(baseColumn, count) {
        if (count <= 1) {
            return [baseColumn];
        }
        if (count === 2) {
            return [baseColumn - 1, baseColumn + 1];
        }
        if (count === 3) {
            return [baseColumn - 1, baseColumn, baseColumn + 1];
        }
        const columns = [];
        for (let i = 0; i < count; i += 1) {
            columns.push(baseColumn - 1 + i);
        }
        return columns;
    }

    getFacilityLabel(type) {
        switch (type) {
            case NODE_TYPES.SHOP:
                return 'Shop';
            case NODE_TYPES.INFIRMARY:
                return 'Infirmary';
            case NODE_TYPES.TOWER:
                return 'Tower of Ten';
            case NODE_TYPES.UPGRADE:
                return 'Upgrade Dice';
            default:
                return 'Encounter';
        }
    }

    getFacilityNodeId(type, enemyIndex, branchKey, facilityIndex) {
        const safeType = type || 'node';
        const safeBranch = branchKey || 'center';
        return `${safeType}-${enemyIndex}-${safeBranch}-${facilityIndex}`;
    }

    assignFacilityBranchKey(currentBranchKey, facilityIndex, facilityCount, transition) {
        if (transition.type === 'split' && currentBranchKey === 'center') {
            if (facilityIndex === 0) {
                return 'left';
            }
            if (facilityIndex === 1) {
                return 'right';
            }
            return this.randomFn() < 0.5 ? 'left' : 'right';
        }

        if (transition.type === 'merge') {
            return 'center';
        }

        return currentBranchKey || 'center';
    }

    addNode(node) {
        this.nodes.push(node);
        this.nodeMap.set(node.id, node);
    }

    getNodes() {
        return this.nodes;
    }

    getNode(nodeId) {
        return this.nodeMap.get(nodeId) || null;
    }

    getAvailableNodeIds() {
        return [...this.frontier];
    }

    beginNode(nodeId) {
        if (!this.nodeMap.has(nodeId)) {
            return;
        }

        this.previousFrontier = [...this.frontier];
        const index = this.frontier.indexOf(nodeId);
        if (index >= 0) {
            this.frontier.splice(index, 1);
        }
        this.currentNodeId = nodeId;
    }

    completeNode(nodeId) {
        if (!nodeId || !this.nodeMap.has(nodeId)) {
            return [];
        }

        this.completedNodeIds.add(nodeId);
        if (this.currentNodeId === nodeId) {
            this.currentNodeId = null;
        }

        this.previousFrontier = [];

        const node = this.nodeMap.get(nodeId);
        const nextIds = (node.connections || []).filter(nextId => !this.completedNodeIds.has(nextId));
        this.frontier = nextIds;
        return nextIds;
    }

    completeCurrentNode() {
        return this.completeNode(this.currentNodeId);
    }

    isNodeCompleted(nodeId) {
        return this.completedNodeIds.has(nodeId);
    }

    getCurrentNodeId() {
        return this.currentNodeId;
    }

    hasPendingNodes() {
        return this.frontier.length > 0;
    }
}

export const PATH_NODE_TYPES = NODE_TYPES;
export const DEFAULT_PATH_ENEMY_SEQUENCE = DEFAULT_ENEMY_SEQUENCE;
