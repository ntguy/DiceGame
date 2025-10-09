const NODE_TYPES = {
    ENEMY: 'enemy',
    SHOP: 'shop',
    INFIRMARY: 'infirmary'
};

const ENEMY_SEQUENCE = [
    {
        enemyIndex: 0,
        rewardGold: 200,
        label: 'Battle',
        start: true
    },
    {
        enemyIndex: 1,
        rewardGold: 200,
        label: 'Battle'
    },
    {
        enemyIndex: 2,
        rewardGold: 200,
        label: 'Battle'
    },
    {
        enemyIndex: 3,
        rewardGold: 300,
        label: 'Boss',
        isBoss: true
    }
];

export class PathManager {
    constructor(randomSource = Math.random) {
        this.randomFn = typeof randomSource === 'function' ? randomSource : Math.random;
        this.nodes = [];
        this.nodeMap = new Map();
        this.currentNodeId = null;
        this.completedNodeIds = new Set();
        this.lockedNodeIds = new Set();
        this.previousFrontier = [];

        this.generatePath();

        this.frontier = this.nodes.filter(node => node.start).map(node => node.id);
        if (this.frontier.length === 0 && this.nodes.length > 0) {
            this.frontier = [this.nodes[0].id];
        }
    }

    generatePath() {
        let currentRow = 0;

        ENEMY_SEQUENCE.forEach((enemyData, index) => {
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

            const isLastEnemy = index === ENEMY_SEQUENCE.length - 1;
            if (isLastEnemy) {
                return;
            }

            const nextEnemyId = `enemy-${index + 1}`;
            const branchTypes = this.randomFn() < 0.5
                ? [NODE_TYPES.SHOP, NODE_TYPES.INFIRMARY]
                : [NODE_TYPES.INFIRMARY, NODE_TYPES.SHOP];

            const branchRow = currentRow + 1;
            const branchColumns = [0, 2];

            branchTypes.forEach((type, branchIndex) => {
                const branchId = `${type}-${index}`;
                const branchNode = {
                    id: branchId,
                    type,
                    label: type === NODE_TYPES.SHOP ? 'Shop' : 'Infirmary',
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

        const siblings = this.previousFrontier || [];
        siblings.forEach(siblingId => {
            if (siblingId !== nodeId) {
                this.lockedNodeIds.add(siblingId);
            }
        });
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

    isNodeLocked(nodeId) {
        return this.lockedNodeIds.has(nodeId);
    }

    getCurrentNodeId() {
        return this.currentNodeId;
    }

    hasPendingNodes() {
        return this.frontier.length > 0;
    }
}

export const PATH_NODE_TYPES = NODE_TYPES;
