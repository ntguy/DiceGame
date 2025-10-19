import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction, lockAction } from './EnemyActions.js';

const INITIAL_BURN_DEFEND_VALUE = 4;

export class AuditorEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Auditor', maxHealth: 100 });

        this.statusActivated = false;
        this.activationMoveRemoved = false;
        this.burnDefendValue = INITIAL_BURN_DEFEND_VALUE;

        this.baseMoves = [
            {
                key: 'auditor_activate_status',
                label: 'Activate Status...',
                createActions: () => {
                    this.statusActivated = true;
                    if (!this.activationMoveRemoved) {
                        this.moves = this.moves.filter(move => move.key !== 'auditor_activate_status');
                        this.moveIndex = Math.max(0, this.moveIndex - 1);
                        this.activationMoveRemoved = true;
                    }
                    return [];
                }
            },
            {
                key: 'auditor_burn_defend',
                label: () => `Burn ${this.burnDefendValue} + Defend ${this.burnDefendValue}`,
                createActions: () => {
                    const value = this.burnDefendValue;
                    this.burnDefendValue += 4;
                    return [burnAction(value), defendAction(value)];
                }
            },
            {
                key: 'auditor_lock_defend',
                label: 'Lock 2 Dice + Defend 10',
                actions: [lockAction(2), defendAction(10)]
            },
            {
                key: 'auditor_attack',
                label: 'Attack 20',
                actions: [attackAction(20)]
            }
        ];

        this.moves = [...this.baseMoves];
    }

    onEncounterStart() {
        this.statusActivated = false;
        this.activationMoveRemoved = false;
        this.burnDefendValue = INITIAL_BURN_DEFEND_VALUE;
        this.moveIndex = 0;
        this.moves = [...this.baseMoves];
    }

    getStatusDescription(upcomingMove) {
        const baseDescription = 'Status: Dice outside a combo are destroyed for a turn.';
        if (!this.statusActivated) {
            const rawKey = typeof upcomingMove?.key === 'string' ? upcomingMove.key : '';
            const baseKey = rawKey.replace(/_\d+$/, '');
            if (baseKey === 'auditor_activate_status') {
                return `${baseDescription} (Activating now.)`;
            }
            return `${baseDescription} (Inactive until Activate Status resolves.)`;
        }
        return baseDescription;
    }

    shouldDestroyDiceOutsideCombo() {
        return this.statusActivated;
    }
}
