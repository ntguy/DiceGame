import { BaseEnemy } from './BaseEnemy.js';
import {
    attackAction,
    burnAction,
    defendAction,
    healAction,
    lockAction,
    nullifyAction,
    weakenAction,
    setMaxDicePerZoneAction
} from './EnemyActions.js';

const DEFAULT_MAX_DICE = 5;
const REDUCED_MAX_DICE = 4;
const BASE_ATTACK_VALUE = 15;
const FINAL_ATTACK_VALUE = 20;
const BASE_DEFEND_VALUE = 15;
const DEFEND_INCREMENT = 5;
const BASE_HEAL_VALUE = 10;
const HEAL_INCREMENT = 5;
const BURN_VALUE = 10;
const CROWD_CONTROL_COUNT = 2;

export class CompactorEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'The Compactor', maxHealth: 123 });

        this.currentMaxDicePerZone = DEFAULT_MAX_DICE;
        this.reducedMaxDicePerZone = REDUCED_MAX_DICE;
        this.defendValue = BASE_DEFEND_VALUE;
        this.healValue = BASE_HEAL_VALUE;
        this.loopCount = 0;
        this.zonalCrushKeys = ['compactor_zonal_crush_a', 'compactor_zonal_crush_b'];

        this.moves = this.buildMoves();
    }

    buildMoves() {
        const moves = [
            this.createPressMove(),
            this.createZonalCrushMove(this.zonalCrushKeys[0]),
            this.createScorchMove(),
            this.createCrowdControlMove(),
            this.createZonalCrushMove(this.zonalCrushKeys[1]),
            this.createFinalSmashMove()
        ];

        return moves.filter(Boolean);
    }

    createPressMove() {
        return {
            key: 'compactor_pressurize',
            label: () => `Pressurize: Attack ${BASE_ATTACK_VALUE} + Defend ${this.defendValue}`,
            createActions: () => [
                attackAction(BASE_ATTACK_VALUE),
                defendAction(this.defendValue)
            ]
        };
    }

    createZonalCrushMove(key) {
        if (!key) {
            return null;
        }

        return {
            key,
            label: 'Zonal Crush: Max 4 Dice Per Zone',
            createActions: () => {
                this.currentMaxDicePerZone = this.reducedMaxDicePerZone;
                // Remove this move after it executes
                this.moves = this.moves.filter(move => move.key !== key);
                this.moveIndex = Math.max(0, this.moveIndex - 1);
                return [setMaxDicePerZoneAction(this.reducedMaxDicePerZone)];
            }
        };
    }

    createScorchMove() {
        return {
            key: 'compactor_scorch',
            label: () => `Scorch: Burn ${BURN_VALUE} + Heal ${this.healValue}`,
            createActions: () => [
                burnAction(BURN_VALUE),
                healAction(this.healValue)
            ]
        };
    }

    createCrowdControlMove() {
        return {
            key: 'compactor_crowd_control',
            label: () => `Crushing Grip: Lock ${CROWD_CONTROL_COUNT} Dice + Nullify ${CROWD_CONTROL_COUNT} Dice + Weaken ${CROWD_CONTROL_COUNT} Dice`,
            actions: [
                lockAction(CROWD_CONTROL_COUNT),
                nullifyAction(CROWD_CONTROL_COUNT),
                weakenAction(CROWD_CONTROL_COUNT)
            ]
        };
    }

    createFinalSmashMove() {
        return {
            key: 'compactor_final_smash',
            label: 'Cataclysmic Press: Attack 20',
            createActions: () => {
                this.defendValue += DEFEND_INCREMENT;
                this.healValue += HEAL_INCREMENT;
                this.loopCount += 1;
                return [attackAction(FINAL_ATTACK_VALUE)];
            }
        };
    }

    onEncounterStart() {
        this.currentMaxDicePerZone = DEFAULT_MAX_DICE;
        this.defendValue = BASE_DEFEND_VALUE;
        this.healValue = BASE_HEAL_VALUE;
        this.loopCount = 0;
        this.moveIndex = 0;
        this.moves = this.buildMoves();
    }

    getStatusDescription() {
        return `Status: Max ${this.currentMaxDicePerZone} Dice Per Zone.`;
    }

    getCurrentMaxDicePerZone() {
        return this.currentMaxDicePerZone;
    }
}
