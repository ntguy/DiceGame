const NODE_TYPES = {
    ENEMY: 'enemy',
    SHOP: 'shop',
    INFIRMARY: 'infirmary',
    TOWER: 'tower',
    UPGRADE: 'upgrade'
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
    constructor({ enemySequence, allowUpgradeNodes = false, upgradeNodeMinEnemyIndex = 1 } = {}, randomSource = Math.random) {
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
        let currentRow = 0;

        this.enemySequence.forEach((enemyData, index) => {
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
            const branchTypes = [];
            const pool = facilityTypes.slice();
            while (branchTypes.length < 2 && pool.length > 0) {
                const index = Math.floor(this.randomFn() * pool.length);
                branchTypes.push(pool.splice(index, 1)[0]);
            }
            if (branchTypes.length < 2) {
                const fallbackPool = facilityTypes.slice();
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

            const branchRow = currentRow + 1;
            const branchColumns = [0, 2];

            branchTypes.forEach((type, branchIndex) => {
                const branchId = `${type}-${index}`;
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
                    connections: [nextEnemyId],
                    row: branchRow,
                    column: branchColumns[branchIndex]
                };

                this.addNode(branchNode);
                enemyNode.connections.push(branchId);
            });

            currentRow = branchRow + 1;
        });
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
