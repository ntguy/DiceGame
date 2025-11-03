import { CONSTANTS } from '../constants.js';

export function playDiceRollSounds(scene, {
    isFirstRoll = false,
    totalDice = 0,
    selectedCount = 0
} = {}) {
    if (!scene || !scene.sound) {
        return;
    }

    const diceTotal = Math.max(0, Number.isFinite(totalDice) ? totalDice : 0);
    const diceSelected = Math.max(0, Number.isFinite(selectedCount) ? selectedCount : 0);

    if (diceSelected <= 0 && !isFirstRoll) {
        return;
    }

    const playDiceRoll = volume => {
        if (typeof scene.playSound === 'function') {
            scene.playSound('diceRoll', { volume });
        } else if (scene.sound && typeof scene.sound.play === 'function') {
            scene.sound.play('diceRoll', { volume });
        }
    };

    const playSingleRoll = (volume, delay = 0) => {
        if (delay > 0 && scene.time && typeof scene.time.delayedCall === 'function') {
            scene.time.delayedCall(delay, () => playDiceRoll(volume));
        } else {
            playDiceRoll(volume);
        }
    };

    if (isFirstRoll || (diceTotal > 0 && diceSelected >= diceTotal)) {
        if (typeof scene.playSound === 'function') {
            scene.playSound('multiDiceRoll');
        } else if (scene.sound && typeof scene.sound.play === 'function') {
            scene.sound.play('multiDiceRoll');
        }
        playSingleRoll(0.75);
        const delay = Phaser.Math.Between(100, 300);
        playSingleRoll(0.5, delay);
        return;
    }

    const defaultVolume = CONSTANTS.DEFAULT_SFX_VOLUME || 0.6;
    for (let i = 0; i < diceSelected; i += 1) {
        const delay = i === 0 ? 0 : Phaser.Math.Between(100, 300);
        const volume = (defaultVolume / (i + 1)) + 0.05;
        playSingleRoll(volume, delay);
    }
}
