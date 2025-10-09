const NODE_TYPES = {
    ENEMY: 'enemy',
    SHOP: 'shop',
    MEDICAL: 'medical'
};

const PATH_NODES = [
    {
        id: 'enemy-0',
        type: NODE_TYPES.ENEMY,
        label: 'Battle',
        enemyIndex: 0,
        connections: ['shop-0', 'medical-0'],
        row: 0,
        column: 1,
        rewardGold: 200,
        start: true
    },
    {
        id: 'shop-0',
        type: NODE_TYPES.SHOP,
        label: 'Shop',
        connections: ['enemy-1'],
        row: 1,
        column: 0
    },
    {
        id: 'medical-0',
        type: NODE_TYPES.MEDICAL,
        label: 'Med Station',
        connections: ['enemy-1'],
        row: 1,
        column: 2
    },
    {
        id: 'enemy-1',
        type: NODE_TYPES.ENEMY,
        label: 'Battle',
        enemyIndex: 1,
        connections: ['enemy-2'],
        row: 2,
        column: 1,
        rewardGold: 200
    },
    {
        id: 'enemy-2',
        type: NODE_TYPES.ENEMY,
        label: 'Battle',
        enemyIndex: 2,
        connections: ['enemy-3'],
        row: 3,
        column: 1,
        rewardGold: 200
    },
    {
        id: 'enemy-3',
        type: NODE_TYPES.ENEMY,
        label: 'Boss',
        enemyIndex: 3,
        connections: [],
        row: 4,
        column: 1,
        rewardGold: 300,
        isBoss: true
    }
];

export class PathManager {
    constructor() {
        this.nodes = PATH_NODES.map(node => ({ ...node }));
        this.nodeMap = new Map(this.nodes.map(node => [node.id, node]));
        this.frontier = this.nodes.filter(node => node.start).map(node => node.id);
        if (this.frontier.length === 0 && this.nodes.length > 0) {
            this.frontier = [this.nodes[0].id];
        }
        this.currentNodeId = null;
        this.completedNodeIds = new Set();
        this.lockedNodeIds = new Set();
        this.previousFrontier = [];
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
