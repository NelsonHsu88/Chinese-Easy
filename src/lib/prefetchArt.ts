import { Asset } from 'expo-asset'

/*
 * Loads the tab screens' paintings ahead of time, a few seconds after launch.
 *
 * In a development build every bundled image is fetched from the dev server
 * the first time a screen shows it — over a tunnel that is a visible pause and
 * the painting popping in late (the Dictionary felt laggy for exactly this
 * reason). In a release build the files are local, and this only warms the
 * decoder's cache. Failures are ignored: a missed prefetch just means the
 * image loads when it is first shown, as before.
 */
const ART: number[] = [
  require('../assets/images/app/basics-characters.png'),
  require('../assets/images/app/basics-hero.png'),
  require('../assets/images/app/basics-pronunciation.png'),
  require('../assets/images/app/basics-sentences.png'),
  require('../assets/images/app/basics-start.png'),
  require('../assets/images/app/basics-writing.png'),
  require('../assets/images/app/dict-characters.png'),
  require('../assets/images/app/dict-discover.png'),
  require('../assets/images/app/dict-header.png'),
  require('../assets/images/app/dict-hsk.png'),
  require('../assets/images/app/dict-my-words.png'),
  require('../assets/images/app/dict-radicals.png'),
  require('../assets/images/app/home-challenge-icon.png'),
  require('../assets/images/app/home-gift.png'),
  require('../assets/images/app/home-hero-ss1020.png'),
  require('../assets/images/app/home-review.png'),
  require('../assets/images/app/home-word.png'),
  require('../assets/images/app/learn-basics.png'),
  require('../assets/images/app/learn-books.png'),
  require('../assets/images/app/learn-hero.png'),
  require('../assets/images/app/learn-new-words.png'),
  require('../assets/images/app/profile-hero.png'),
  require('../assets/images/app/profile-hsk-scene.png'),
  require('../assets/images/app/review-flashcards.png'),
  require('../assets/images/app/review-hero.png'),
  require('../assets/images/app/review-mistakes.png'),
  require('../assets/images/app/review-mixed.png'),
  require('../assets/images/app/review-quote-scene.png'),
  require('../assets/images/app/review-quote-shifu.png'),
  require('../assets/images/home/review.png'),
  require('../assets/images/learn/foot.png'),
  require('../assets/images/decor/cloud-cluster.png'),
  require('../assets/images/decor/cloud-wisp.png'),
  require('../assets/images/decor/cloud-drift.png'),
]

export function prefetchArt(): void {
  Asset.loadAsync(ART).catch(() => {})
}
