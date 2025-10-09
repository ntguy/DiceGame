import { createIroncladDie } from './IroncladDie.js';
import { createGildedPip } from './GildedPip.js';
import { createStoneWard } from './StoneWard.js';

export function getRelicCatalog() {
    return [
        createIroncladDie(),
        createGildedPip(),
        createStoneWard()
    ];
}
