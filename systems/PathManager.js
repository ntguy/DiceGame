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
        const totalLevels = 7;
        const levelSizes = [];

        const chooseLevelSize = () => (this.randomFn() < 0.5 ? 2 : 3);
        const getColumns = (count) => (count === 2 ? [0, 2] : [0, 1, 2]);

        for (let levelIndex = 0; levelIndex < totalLevels; levelIndex += 1) {
            const size = chooseLevelSize();
            levelSizes.push(size);
        }

        if (!levelSizes.slice(1).some(size => size === 3)) {
            const randomLevel = 1 + Math.floor(this.randomFn() * (totalLevels - 1));
            levelSizes[randomLevel] = 3;
        }

        const levelNodes = [];

        const nonBossEnemies = this.enemySequence.filter(entry => !entry.isBoss);
        const bossEnemy = this.enemySequence.find(entry => entry.isBoss) || this.enemySequence[this.enemySequence.length - 1];
        const bossEnemyData = bossEnemy || {
            enemyIndex: nonBossEnemies.length,
            rewardGold: 0,
            label: 'Boss'
        };

        const getEnemyData = (index) => {
            if (nonBossEnemies.length === 0) {
                return {
                    enemyIndex: 0,
                    rewardGold: 0,
                    label: 'Battle'
                };
            }

            const clampedIndex = Math.min(index, nonBossEnemies.length - 1);
            const enemy = nonBossEnemies[clampedIndex];
            return {
                enemyIndex: typeof enemy.enemyIndex === 'number' ? enemy.enemyIndex : clampedIndex,
                rewardGold: Number.isFinite(enemy.rewardGold) ? enemy.rewardGold : 0,
                label: enemy.label || 'Battle',
                start: enemy.start || false
            };
        };

        const createLocationLabel = (type) => {
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
                    return 'Visit';
            }
        };

        for (let levelIndex = 0; levelIndex < totalLevels; levelIndex += 1) {
            const nodeCount = levelSizes[levelIndex];
            const columns = getColumns(nodeCount);
            const nodes = [];

            if (levelIndex === 0) {
                for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
                    nodes.push({
                        type: NODE_TYPES.ENEMY,
                        column: columns[nodeIndex],
                        row: levelIndex,
                        isBattle: true,
                        start: true
                    });
                }
            } else {
                let facilityTypes = this.getFacilityTypesForEnemyIndex(
                    Math.max(0, Math.min(levelIndex - 1, this.enemySequence.length - 2))
                );
                if (!Array.isArray(facilityTypes) || facilityTypes.length === 0) {
                    facilityTypes = [NODE_TYPES.SHOP];
                }
                const pool = facilityTypes.slice();
                const chosenTypes = [];
                while (chosenTypes.length < nodeCount && pool.length > 0) {
                    const pickIndex = Math.floor(this.randomFn() * pool.length);
                    chosenTypes.push(pool.splice(pickIndex, 1)[0]);
                }
                while (chosenTypes.length < nodeCount) {
                    const fallbackType = facilityTypes[(chosenTypes.length) % facilityTypes.length] || NODE_TYPES.SHOP;
                    if (!chosenTypes.includes(fallbackType)) {
                        chosenTypes.push(fallbackType);
                    } else {
                        chosenTypes.push(NODE_TYPES.SHOP);
                    }
                }

                for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
                    const type = chosenTypes[nodeIndex];
                    nodes.push({
                        type,
                        column: columns[nodeIndex],
                        row: levelIndex,
                        label: createLocationLabel(type),
                        connections: [],
                        isBattle: false,
                        start: false
                    });
                }
            }

            levelNodes.push(nodes);
        }

        const locationLevelIndices = [1, 2, 3, 4, 5, 6];
        let selectedLevels = [];
        while (true) {
            const pool = locationLevelIndices.slice();
            selectedLevels = [];
            for (let i = 0; i < 3; i += 1) {
                const pickIndex = Math.floor(this.randomFn() * pool.length);
                selectedLevels.push(pool.splice(pickIndex, 1)[0]);
            }
            selectedLevels.sort((a, b) => a - b);

            const hasThreeNodeLevel = selectedLevels.some(index => levelNodes[index].length === 3);
            const isAllConsecutive = selectedLevels[0] + 1 === selectedLevels[1] && selectedLevels[1] + 1 === selectedLevels[2];

            if (hasThreeNodeLevel && !isAllConsecutive) {
                break;
            }
        }

        const threeNodeCandidates = selectedLevels.filter(index => levelNodes[index].length === 3);
        const primaryBattleLevelIndex = threeNodeCandidates[Math.floor(this.randomFn() * threeNodeCandidates.length)];
        const remainingBattleLevels = selectedLevels.filter(index => index !== primaryBattleLevelIndex);
        if (remainingBattleLevels.length !== 2) {
            throw new Error('Path generation failed to determine battle levels');
        }

        const assignTwoBattlesFirst = this.randomFn() < 0.5;
        const battleAssignments = new Map();
        battleAssignments.set(primaryBattleLevelIndex, 2);
        battleAssignments.set(remainingBattleLevels[assignTwoBattlesFirst ? 0 : 1], 2);
        battleAssignments.set(remainingBattleLevels[assignTwoBattlesFirst ? 1 : 0], 1);

        const battleNodeIndices = new Map();
        battleAssignments.forEach((count, levelIndex) => {
            const nodes = levelNodes[levelIndex];
            const pool = nodes.map((_, idx) => idx);
            const selected = [];
            for (let i = 0; i < count && pool.length > 0; i += 1) {
                const pick = Math.floor(this.randomFn() * pool.length);
                selected.push(pool.splice(pick, 1)[0]);
            }
            battleNodeIndices.set(levelIndex, selected);
        });

        let battleCounter = 0;
        for (let levelIndex = 0; levelIndex < levelNodes.length; levelIndex += 1) {
            const nodes = levelNodes[levelIndex];
            const indicesToConvert = battleNodeIndices.get(levelIndex) || [];

            indicesToConvert.forEach((nodeIndex) => {
                const node = nodes[nodeIndex];
                node.isBattle = true;
                node.type = NODE_TYPES.ENEMY;
                delete node.label;
                delete node.connections;
            });

            nodes.forEach((node) => {
                if (node.isBattle) {
                    const enemyData = getEnemyData(battleCounter);
                    const nodeId = `enemy-${battleCounter}`;
                    node.id = nodeId;
                    node.label = enemyData.label || 'Battle';
                    node.enemyIndex = enemyData.enemyIndex;
                    node.rewardGold = enemyData.rewardGold;
                    node.start = levelIndex === 0;
                    node.isBoss = false;
                    node.connections = [];
                    battleCounter += 1;
                } else {
                    node.id = `${node.type}-${levelIndex}-${node.column}`;
                    node.connections = [];
                }
            });
        }

        const bossNode = {
            id: `enemy-${battleCounter}`,
            type: NODE_TYPES.ENEMY,
            label: bossEnemyData.label || 'Boss',
            enemyIndex: typeof bossEnemyData.enemyIndex === 'number' ? bossEnemyData.enemyIndex : battleCounter,
            rewardGold: Number.isFinite(bossEnemyData.rewardGold) ? bossEnemyData.rewardGold : 0,
            isBoss: true,
            row: totalLevels,
            column: 1,
            connections: [],
            start: false
        };

        const connectLevels = (upperNodes, lowerNodes) => {
            if (!upperNodes || !lowerNodes) {
                return;
            }

            const upperCount = upperNodes.length;
            const lowerCount = lowerNodes.length;

            const addConnection = (fromNode, toNode) => {
                if (!fromNode.connections.includes(toNode.id)) {
                    fromNode.connections.push(toNode.id);
                }
            };

            if (upperCount === 2 && lowerCount === 2) {
                addConnection(upperNodes[0], lowerNodes[0]);
                addConnection(upperNodes[1], lowerNodes[1]);
                if (this.randomFn() < 0.5) {
                    const index = this.randomFn() < 0.5 ? 0 : 1;
                    addConnection(upperNodes[index], lowerNodes[index === 0 ? 1 : 0]);
                }
                return;
            }

            if (upperCount === 2 && lowerCount === 3) {
                addConnection(upperNodes[0], lowerNodes[0]);
                addConnection(upperNodes[1], lowerNodes[2]);
                const roll = this.randomFn();
                if (roll < 0.5) {
                    addConnection(upperNodes[0], lowerNodes[1]);
                    addConnection(upperNodes[1], lowerNodes[1]);
                } else if (roll < 0.75) {
                    addConnection(upperNodes[0], lowerNodes[1]);
                } else {
                    addConnection(upperNodes[1], lowerNodes[1]);
                }
                return;
            }

            if (upperCount === 3 && lowerCount === 2) {
                addConnection(upperNodes[0], lowerNodes[0]);
                addConnection(upperNodes[2], lowerNodes[1]);
                const roll = this.randomFn();
                if (roll < 0.5) {
                    addConnection(upperNodes[1], lowerNodes[0]);
                    addConnection(upperNodes[1], lowerNodes[1]);
                } else if (roll < 0.75) {
                    addConnection(upperNodes[1], lowerNodes[0]);
                } else {
                    addConnection(upperNodes[1], lowerNodes[1]);
                }
                return;
            }

            if (upperCount === 3 && lowerCount === 3) {
                addConnection(upperNodes[0], lowerNodes[0]);
                addConnection(upperNodes[1], lowerNodes[1]);
                addConnection(upperNodes[2], lowerNodes[2]);
                const roll = this.randomFn();
                if (roll < (1 / 3)) {
                    addConnection(upperNodes[0], lowerNodes[1]);
                } else if (roll < (2 / 3)) {
                    addConnection(upperNodes[2], lowerNodes[1]);
                } else {
                    addConnection(upperNodes[1], lowerNodes[0]);
                    addConnection(upperNodes[1], lowerNodes[2]);
                }
            }
        };

        for (let levelIndex = 0; levelIndex < levelNodes.length - 1; levelIndex += 1) {
            connectLevels(levelNodes[levelIndex], levelNodes[levelIndex + 1]);
        }

        const finalLevelNodes = levelNodes[levelNodes.length - 1];
        finalLevelNodes.forEach((node) => {
            if (!node.connections.includes(bossNode.id)) {
                node.connections.push(bossNode.id);
            }
        });

        levelNodes.forEach((nodes) => {
            nodes.forEach((node) => this.addNode(node));
        });
        this.addNode(bossNode);
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
