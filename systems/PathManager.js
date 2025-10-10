const NODE_TYPES = {
    ENEMY: 'enemy',
    SHOP: 'shop',
    INFIRMARY: 'infirmary',
    TOWER: 'tower'
};

const ENEMY_SEQUENCE = [
    {
        enemyIndex: 0,
        rewardGold: 600,
        label: 'Battle',
        start: true
    },
    {
        enemyIndex: 1,
        rewardGold: 500, // TODO reduce
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
    constructor(randomSource = Math.random) {
        this.randomFn = typeof randomSource === 'function' ? randomSource : Math.random;
        this.nodes = [];
        this.nodeMap = new Map();
        this.currentNodeId = null;
        this.completedNodeIds = new Set();
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
            const branchTypes = this.pickFacilityPair();

            const branchRow = currentRow + 1;
            const branchColumns = [0, 2];

            branchTypes.forEach((type, branchIndex) => {
                const branchId = `${type}-${index}`;
                const branchNode = {
                    id: branchId,
                    type,
                    label: this.getFacilityLabel(type),
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

    pickFacilityPair() {
        const facilities = [NODE_TYPES.SHOP, NODE_TYPES.INFIRMARY, NODE_TYPES.TOWER];
        for (let i = facilities.length - 1; i > 0; i -= 1) {
            const j = Math.floor(this.randomFn() * (i + 1));
            [facilities[i], facilities[j]] = [facilities[j], facilities[i]];
        }
        return facilities.slice(0, 2);
    }

    getFacilityLabel(type) {
        switch (type) {
            case NODE_TYPES.SHOP:
                return 'Shop';
            case NODE_TYPES.INFIRMARY:
                return 'Infirmary';
            case NODE_TYPES.TOWER:
                return 'Tower';
            default:
                return '???';
        }
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
