import type { TourShifu } from '../../lib/tour'

/*
 * The tour's watercolour, cut from its asset sheet by
 * `scripts/processTourArt.mjs`. Each `ratio` is the processed file's own
 * width / height, measured after the trim — re-running the script means
 * re-checking these. Callers pick a width and derive the height.
 */

export const tourShifu: Record<TourShifu, { source: number; ratio: number }> = {
  welcome: { source: require('../../assets/images/tour/shifu-welcome.png'), ratio: 189 / 203 },
  point: { source: require('../../assets/images/tour/shifu-point.png'), ratio: 200 / 197 },
  celebrate: { source: require('../../assets/images/tour/shifu-celebrate.png'), ratio: 155 / 209 },
  thinking: { source: require('../../assets/images/tour/shifu-thinking.png'), ratio: 138 / 199 },
}

export const tourSakura = { source: require('../../assets/images/tour/corner-sakura.png'), ratio: 135 / 90 }
