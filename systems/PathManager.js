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
        this.nodes = [];
        this.nodeMap = new Map();

        const LEVEL_COUNT = 7;
        const columnLayouts = {
            2: [0, 2],
            3: [0, 1, 2]
        };

        const locationTypesBase = [NODE_TYPES.SHOP, NODE_TYPES.INFIRMARY, NODE_TYPES.TOWER];
        if (this.allowUpgradeNodes) {
            locationTypesBase.push(NODE_TYPES.UPGRADE);
        }

        const enemyEntries = this.enemySequence.filter(entry => !entry.isBoss);
        const bossEntry = this.enemySequence.find(entry => entry.isBoss)
            || this.enemySequence[this.enemySequence.length - 1]
            || {
                enemyIndex: enemyEntries.length,
                rewardGold: 200,
                label: 'Boss',
                isBoss: true
            };

        let battleCursor = 0;

        const createLabelForType = type => {
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

        const assignBattleData = (node, { isStart = false } = {}) => {
            const enemyData = enemyEntries.length > 0
                ? enemyEntries[Math.min(battleCursor, enemyEntries.length - 1)]
                : null;

            node.type = NODE_TYPES.ENEMY;
            node.label = (enemyData && enemyData.label) || 'Battle';
            node.enemyIndex = enemyData ? enemyData.enemyIndex : battleCursor;
            node.rewardGold = enemyData ? enemyData.rewardGold : 50;
            node.isBoss = false;
            node.start = !!isStart;
            node.connections = Array.isArray(node.connections) ? node.connections : [];

            battleCursor += 1;
        };

        const createLocationNodes = (levelIndex, nodeCount) => {
            const availableTypes = locationTypesBase.slice();
            const chosenTypes = [];

            while (chosenTypes.length < nodeCount && availableTypes.length > 0) {
                const index = Math.floor(this.randomFn() * availableTypes.length);
                chosenTypes.push(availableTypes.splice(index, 1)[0]);
            }

            while (chosenTypes.length < nodeCount) {
                const fallbackType = locationTypesBase[chosenTypes.length % locationTypesBase.length];
                chosenTypes.push(fallbackType);
            }

            const columns = columnLayouts[nodeCount];
            return chosenTypes.map((type, nodeIndex) => ({
                id: `node-${levelIndex}-${nodeIndex}`,
                type,
                label: createLabelForType(type),
                connections: [],
                row: levelIndex,
                column: columns[nodeIndex],
                start: false,
                isBoss: false
            }));
        };

        const ensureConnection = (node, targetId) => {
            if (!node || !targetId) {
                return;
            }
            node.connections = Array.isArray(node.connections) ? node.connections : [];
            if (!node.connections.includes(targetId)) {
                node.connections.push(targetId);
            }
        };

        const getNodeByColumn = (nodes, column) => nodes.find(node => node.column === column) || null;

        const levels = [];

        const generateNodeCount = () => (this.randomFn() < 0.5 ? 2 : 3);

        // Level 0: battle nodes only.
        const firstLevelCount = generateNodeCount();
        const firstLevelColumns = columnLayouts[firstLevelCount];
        const firstLevelNodes = firstLevelColumns.map((column, nodeIndex) => ({
            id: `node-0-${nodeIndex}`,
            row: 0,
            column,
            connections: [],
            start: true,
            isBoss: false
        }));

        firstLevelNodes.forEach(node => assignBattleData(node, { isStart: true }));
        levels.push({ nodes: firstLevelNodes, row: 0 });

        // Levels 1-6: start as location nodes.
        for (let levelIndex = 1; levelIndex < LEVEL_COUNT; levelIndex += 1) {
            const nodeCount = generateNodeCount();
            const nodes = createLocationNodes(levelIndex, nodeCount);
            levels.push({ nodes, row: levelIndex });
        }

        // Ensure at least one of levels 1-6 has three nodes.
        if (!levels.slice(1).some(level => level.nodes.length === 3)) {
            const targetIndex = 1 + Math.floor(this.randomFn() * 6);
            const level = levels[targetIndex];
            const usedTypes = level.nodes.map(node => node.type);
            const availableTypes = locationTypesBase.filter(type => !usedTypes.includes(type));
            const newType = availableTypes.length > 0
                ? availableTypes[Math.floor(this.randomFn() * availableTypes.length)]
                : locationTypesBase[0];
            const newNode = {
                id: `node-${targetIndex}-${level.nodes.length}`,
                type: newType,
                label: createLabelForType(newType),
                connections: [],
                row: targetIndex,
                column: 1,
                start: false,
                isBoss: false
            };
            level.nodes.push(newNode);
        }

        const candidateLevelIndices = [1, 2, 3, 4, 5, 6];
        let selectedLevelIndices = null;
        const attempts = 200;

        const sampleThreeLevels = () => {
            const pool = candidateLevelIndices.slice();
            const sample = [];
            while (sample.length < 3 && pool.length > 0) {
                const index = Math.floor(this.randomFn() * pool.length);
                sample.push(pool.splice(index, 1)[0]);
            }
            return sample;
        };

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const sample = sampleThreeLevels();
            if (sample.length < 3) {
                continue;
            }
            const hasThreeNodeLevel = sample.some(index => levels[index].nodes.length === 3);
            const sorted = sample.slice().sort((a, b) => a - b);
            const isConsecutiveTriple = sorted[2] - sorted[0] === 2 && sorted[1] - sorted[0] === 1;
            if (hasThreeNodeLevel && !isConsecutiveTriple) {
                selectedLevelIndices = sample;
                break;
            }
        }

        if (!selectedLevelIndices) {
            const threeNodeIndices = candidateLevelIndices.filter(index => levels[index].nodes.length === 3);
            const baseIndex = threeNodeIndices.length > 0
                ? threeNodeIndices[Math.floor(this.randomFn() * threeNodeIndices.length)]
                : candidateLevelIndices[0];
            selectedLevelIndices = [baseIndex];
            const remaining = candidateLevelIndices.filter(index => index !== baseIndex);
            while (selectedLevelIndices.length < 3 && remaining.length > 0) {
                const index = Math.floor(this.randomFn() * remaining.length);
                const candidate = remaining.splice(index, 1)[0];
                const tentative = selectedLevelIndices.concat(candidate);
                const sorted = tentative.slice().sort((a, b) => a - b);
                const isConsecutiveTriple = sorted.length === 3
                    && sorted[2] - sorted[0] === 2
                    && sorted[1] - sorted[0] === 1;
                if (tentative.length < 3 || !isConsecutiveTriple) {
                    selectedLevelIndices.push(candidate);
                }
            }
            while (selectedLevelIndices.length < 3) {
                const fallback = candidateLevelIndices.find(index => !selectedLevelIndices.includes(index));
                if (typeof fallback === 'number') {
                    selectedLevelIndices.push(fallback);
                } else {
                    break;
                }
            }
            selectedLevelIndices = selectedLevelIndices.slice(0, 3);
        }

        const threeNodeLevels = selectedLevelIndices.filter(index => levels[index].nodes.length === 3);
        const primaryThreeNodeLevelIndex = threeNodeLevels.length > 0
            ? threeNodeLevels[Math.floor(this.randomFn() * threeNodeLevels.length)]
            : selectedLevelIndices[0];

        const remainingBattleLevels = selectedLevelIndices.filter(index => index !== primaryThreeNodeLevelIndex);
        const battleReplacementCounts = this.randomFn() < 0.5 ? [1, 2] : [2, 1];

        const chooseNodeIndices = (level, count) => {
            const available = level.nodes.map((_, idx) => idx);
            if (count >= available.length) {
                return available;
            }
            const chosen = [];
            const pool = available.slice();
            while (chosen.length < count && pool.length > 0) {
                const index = Math.floor(this.randomFn() * pool.length);
                chosen.push(pool.splice(index, 1)[0]);
            }
            return chosen;
        };

        const convertLevelNodesToBattles = (levelIndex, count) => {
            if (count <= 0) {
                return;
            }
            const level = levels[levelIndex];
            const indices = chooseNodeIndices(level, count);
            indices.forEach(nodeIndex => {
                const node = level.nodes[nodeIndex];
                assignBattleData(node, { isStart: false });
            });
        };

        // Primary three-node level gets two battle nodes.
        convertLevelNodesToBattles(primaryThreeNodeLevelIndex, Math.min(2, levels[primaryThreeNodeLevelIndex].nodes.length));

        // Remaining two levels get 1 and 2 battle nodes respectively.
        remainingBattleLevels.forEach((levelIndex, idx) => {
            const count = battleReplacementCounts[idx] || 1;
            convertLevelNodesToBattles(levelIndex, Math.min(count, levels[levelIndex].nodes.length));
        });

        const connectLevels = (upperLevel, lowerLevel) => {
            const upperCount = upperLevel.nodes.length;
            const lowerCount = lowerLevel.nodes.length;

            if (upperCount === 2 && lowerCount === 3) {
                const topLeft = getNodeByColumn(upperLevel.nodes, 0);
                const topRight = getNodeByColumn(upperLevel.nodes, 2);
                const bottomLeft = getNodeByColumn(lowerLevel.nodes, 0);
                const bottomMiddle = getNodeByColumn(lowerLevel.nodes, 1);
                const bottomRight = getNodeByColumn(lowerLevel.nodes, 2);

                ensureConnection(topLeft, bottomLeft && bottomLeft.id);
                ensureConnection(topRight, bottomRight && bottomRight.id);

                const roll = this.randomFn();
                if (roll < 0.5) {
                    ensureConnection(topLeft, bottomMiddle && bottomMiddle.id);
                    ensureConnection(topRight, bottomMiddle && bottomMiddle.id);
                } else if (roll < 0.75) {
                    ensureConnection(topLeft, bottomMiddle && bottomMiddle.id);
                } else {
                    ensureConnection(topRight, bottomMiddle && bottomMiddle.id);
                }
            } else if (upperCount === 3 && lowerCount === 2) {
                const topLeft = getNodeByColumn(upperLevel.nodes, 0);
                const topMiddle = getNodeByColumn(upperLevel.nodes, 1);
                const topRight = getNodeByColumn(upperLevel.nodes, 2);
                const bottomLeft = getNodeByColumn(lowerLevel.nodes, 0);
                const bottomRight = getNodeByColumn(lowerLevel.nodes, 2);

                ensureConnection(topLeft, bottomLeft && bottomLeft.id);
                ensureConnection(topRight, bottomRight && bottomRight.id);

                const roll = this.randomFn();
                if (roll < 0.5) {
                    ensureConnection(topMiddle, bottomLeft && bottomLeft.id);
                    ensureConnection(topMiddle, bottomRight && bottomRight.id);
                } else if (roll < 0.75) {
                    ensureConnection(topMiddle, bottomLeft && bottomLeft.id);
                } else {
                    ensureConnection(topMiddle, bottomRight && bottomRight.id);
                }
            } else if (upperCount === 2 && lowerCount === 2) {
                const topLeft = getNodeByColumn(upperLevel.nodes, 0);
                const topRight = getNodeByColumn(upperLevel.nodes, 2);
                const bottomLeft = getNodeByColumn(lowerLevel.nodes, 0);
                const bottomRight = getNodeByColumn(lowerLevel.nodes, 2);

                ensureConnection(topLeft, bottomLeft && bottomLeft.id);
                ensureConnection(topRight, bottomRight && bottomRight.id);

                if (this.randomFn() < 0.5) {
                    const connectBoth = this.randomFn() < 0.5 ? topLeft : topRight;
                    ensureConnection(connectBoth, bottomLeft && bottomLeft.id);
                    ensureConnection(connectBoth, bottomRight && bottomRight.id);
                }
            } else if (upperCount === 3 && lowerCount === 3) {
                const topLeft = getNodeByColumn(upperLevel.nodes, 0);
                const topMiddle = getNodeByColumn(upperLevel.nodes, 1);
                const topRight = getNodeByColumn(upperLevel.nodes, 2);
                const bottomLeft = getNodeByColumn(lowerLevel.nodes, 0);
                const bottomMiddle = getNodeByColumn(lowerLevel.nodes, 1);
                const bottomRight = getNodeByColumn(lowerLevel.nodes, 2);

                ensureConnection(topLeft, bottomLeft && bottomLeft.id);
                ensureConnection(topMiddle, bottomMiddle && bottomMiddle.id);
                ensureConnection(topRight, bottomRight && bottomRight.id);

                const roll = this.randomFn();
                if (roll < 1 / 3) {
                    ensureConnection(topLeft, bottomMiddle && bottomMiddle.id);
                } else if (roll < 2 / 3) {
                    ensureConnection(topMiddle, bottomLeft && bottomLeft.id);
                    ensureConnection(topMiddle, bottomMiddle && bottomMiddle.id);
                    ensureConnection(topMiddle, bottomRight && bottomRight.id);
                } else {
                    ensureConnection(topRight, bottomMiddle && bottomMiddle.id);
                }
            } else {
                // Fallback: connect each node to the closest nodes based on column values.
                upperLevel.nodes.forEach(upperNode => {
                    const sortedLowerNodes = lowerLevel.nodes.slice().sort((a, b) => Math.abs(a.column - upperNode.column) - Math.abs(b.column - upperNode.column));
                    if (sortedLowerNodes[0]) {
                        ensureConnection(upperNode, sortedLowerNodes[0].id);
                    }
                    if (sortedLowerNodes[1] && this.randomFn() < 0.5) {
                        ensureConnection(upperNode, sortedLowerNodes[1].id);
                    }
                });
            }
        };

        for (let levelIndex = 0; levelIndex < LEVEL_COUNT - 1; levelIndex += 1) {
            const upperLevel = levels[levelIndex];
            const lowerLevel = levels[levelIndex + 1];
            connectLevels(upperLevel, lowerLevel);
        }

        // Create the boss node and connect final level nodes to it.
        const bossNode = {
            id: 'boss-node',
            type: NODE_TYPES.ENEMY,
            label: bossEntry.label || 'Boss',
            enemyIndex: bossEntry.enemyIndex,
            rewardGold: bossEntry.rewardGold,
            isBoss: true,
            start: false,
            row: LEVEL_COUNT,
            column: 1,
            connections: []
        };

        const finalLevel = levels[LEVEL_COUNT - 1];
        finalLevel.nodes.forEach(node => {
            ensureConnection(node, bossNode.id);
        });

        levels.forEach(level => {
            level.nodes.forEach(node => {
                this.addNode(node);
            });
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
