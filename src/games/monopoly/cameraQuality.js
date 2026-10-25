// Vue d'ensemble : les bords du plateau correspondent aux bords du cadre.
import { BOARD_SIZE } from './pawnMotion.js';
export function overviewHeight(fov, aspect = 1) {
 return (BOARD_SIZE / 2) / (Math.tan(fov * Math.PI / 360) * Math.min(1, Math.max(.1, aspect)));
}
export function renderPixelRatio(deviceRatio) {
 return Math.max(1, Math.min(Number.isFinite(deviceRatio) ? deviceRatio : 1, 2.5));
}
