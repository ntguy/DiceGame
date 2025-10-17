const NODE_TYPES = {
    ENEMY: 'enemy',
    SHOP: 'shop',
    INFIRMARY: 'infirmary',
    TOWER: 'tower',
    UPGRADE: 'upgrade'
};

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

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
    constructor({ enemySequence, allowUpgradeNodes = false, upgradeNodeMinEnemyIndex = 1, skipConnectionChance = 0.35, detourConnectionChance = 0.35 } = {}, randomSource = Math.random) {
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
        this.skipConnectionChance = clamp(skipConnectionChance, 0, 1);
        this.detourConnectionChance = clamp(detourConnectionChance, 0, 1);
        this.detourNodeCounter = 0;

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
        let nextEnemyRow = 0;

        this.enemySequence.forEach((enemyData, index) => {
            const currentRow = nextEnemyRow;
            const enemyId = `enemy-${index}`;
            const enemyNode = {
                id: enemyId,
                type: NODE_TYPES.ENEMY,
                label: enemyData.label || 'Battle',
                enemyIndex: enemyData.enemyIndex,
                connections: [],
                row: currentRow,
                column: 1,
                rewardGold: enemyData.rewardGold,
                isBoss: enemyData.isBoss || false,
                start: enemyData.start || false
            };

            this.addNode(enemyNode);

            const isLastEnemy = index === this.enemySequence.length - 1;
            if (isLastEnemy) {
                return;
            }

            const nextEnemyId = `enemy-${index + 1}`;
            const facilityTypes = this.getFacilityTypesForEnemyIndex(index);
            const branchTypes = this.pickFacilityBranchTypes(facilityTypes);
            const branchRow = currentRow + 1;
            const branchColumns = [0, 2];

            const { targets, detourNode, additionalRows } = this.createBranchTargets({
                index,
                enemyData,
                nextEnemyId,
                branchRow
            });
            const branchTargets = this.assignTargetsToBranches(branchTypes.length, targets);

            branchTypes.forEach((type, branchIndex) => {
                const branchId = `${type}-${index}`;
                const targetId = branchTargets[branchIndex] || nextEnemyId;
                const branchNode = {
                    id: branchId,
                    type,
                    label: type === NODE_TYPES.SHOP
                        ? 'Shop'
                        : type === NODE_TYPES.INFIRMARY
                            ? 'Infirmary'
                            : type === NODE_TYPES.TOWER
                                ? 'Tower of Ten'
                                : 'Upgrade Dice',
                    connections: [targetId],
                    row: branchRow,
                    column: branchColumns[branchIndex]
                };

                this.addNode(branchNode);
                enemyNode.connections.push(branchId);
            });

            if (detourNode) {
                this.addNode(detourNode);
            }

            nextEnemyRow = currentRow + 2 + additionalRows;
        });
    }

    pickFacilityBranchTypes(facilityTypes) {
        const branchTypes = [];
        const pool = Array.isArray(facilityTypes) ? facilityTypes.slice() : [];

        while (branchTypes.length < 2 && pool.length > 0) {
            const index = Math.floor(this.randomFn() * pool.length);
            branchTypes.push(pool.splice(index, 1)[0]);
        }

        if (branchTypes.length < 2) {
            const fallbackPool = Array.isArray(facilityTypes) ? facilityTypes.slice() : [];
            while (branchTypes.length < 2 && fallbackPool.length > 0) {
                const type = fallbackPool.shift();
                if (!branchTypes.includes(type)) {
                    branchTypes.push(type);
                }
            }

            while (branchTypes.length < 2) {
                branchTypes.push(NODE_TYPES.SHOP);
            }

            branchTypes.splice(2);
        }

        return branchTypes;
    }

    createBranchTargets({ index, enemyData, nextEnemyId, branchRow }) {
        const targets = [{ id: nextEnemyId, type: 'direct' }];
        let detourNode = null;
        let additionalRows = 0;

        const skipTargetIndex = index + 2;
        if (skipTargetIndex < this.enemySequence.length && this.randomFn() < this.skipConnectionChance) {
            targets.push({ id: `enemy-${skipTargetIndex}`, type: 'skip' });
        }

        const nextEnemyData = this.enemySequence[index + 1];
        const canCreateDetour = nextEnemyData && !nextEnemyData.isBoss;
        if (canCreateDetour && this.randomFn() < this.detourConnectionChance) {
            detourNode = this.createDetourEnemyNode({
                baseNextEnemyId: nextEnemyId,
                previousEnemyData: enemyData,
                nextEnemyData,
                row: branchRow + 1
            });
            targets.push({ id: detourNode.id, type: 'detour' });
            additionalRows = 1;
        }

        return { targets, detourNode, additionalRows };
    }

    assignTargetsToBranches(branchCount, targetOptions) {
        if (!Array.isArray(targetOptions) || targetOptions.length === 0 || branchCount <= 0) {
            return [];
        }

        const options = targetOptions.slice();
        const directIndex = options.findIndex(option => option.type === 'direct');
        const selectedTargets = [];
        let directTarget;

        if (directIndex >= 0) {
            directTarget = options.splice(directIndex, 1)[0];
        } else {
            directTarget = options.shift();
        }

        selectedTargets.push(directTarget.id);

        for (let i = 1; i < branchCount; i += 1) {
            if (options.length === 0) {
                options.push(...targetOptions);
            }
            const index = Math.floor(this.randomFn() * options.length);
            const chosen = options.splice(index, 1)[0] || directTarget;
            selectedTargets.push(chosen.id);
        }

        return selectedTargets;
    }

    createDetourEnemyNode({ baseNextEnemyId, previousEnemyData = {}, nextEnemyData = {}, row }) {
        const detourId = `${baseNextEnemyId}-detour-${this.detourNodeCounter++}`;
        const enemyIndex = Number.isFinite(nextEnemyData.enemyIndex)
            ? nextEnemyData.enemyIndex
            : (Number.isFinite(previousEnemyData.enemyIndex) ? previousEnemyData.enemyIndex : 0);
        const rewardGold = this.calculateDetourReward(previousEnemyData.rewardGold, nextEnemyData.rewardGold);

        return {
            id: detourId,
            type: NODE_TYPES.ENEMY,
            label: nextEnemyData.label || 'Battle',
            enemyIndex,
            connections: [baseNextEnemyId],
            row,
            column: 1,
            rewardGold,
            isBoss: false,
            start: false
        };
    }

    calculateDetourReward(previousReward, nextReward) {
        const values = [previousReward, nextReward]
            .map(value => (Number.isFinite(value) ? value : null))
            .filter(value => value !== null);

        if (values.length === 0) {
            return 0;
        }

        const total = values.reduce((sum, value) => sum + value, 0);
        return Math.max(0, Math.round(total / values.length));
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
