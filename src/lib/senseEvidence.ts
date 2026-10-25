/*
 * Does an English translation show a given dictionary sense?
 *
 * Example sentences come from a corpus matched on the Chinese alone, and a
 * Chinese word carries several senses: 看 is "to look after" and "to watch",
 * 月 is "moon" and "month". The only offline signal for which one a sentence
 * uses is its own English translation, so this asks whether the translation
 * contains a content word of the sense, after crude stemming on both sides.
 *
 * It is a heuristic, and its callers treat it as one: it picks *which* listed
 * sense to show beside a sentence, and orders sentences. A translation that
 * shows no sense at all (a free rendering, an idiom) is no evidence either way.
 *
 * Pure and dependency-free, so `definitions.ts` and the data scripts can both
 * use it.
 */

/** Function words that say nothing about which sense is meant. */
const STOP = new Set(
  (
    'a an the to of be is are was were been being am in on at for with by from up out off as and or but ' +
    'it its this that these those one ones someone something somebody oneself so very not no ' +
    'into onto over under about than then there here which who what when where how all any some such ' +
    'used use also for example that is especially person people thing things way kind sort s t'
  ).split(' '),
)

/** Common irregular forms, mapped to the base a gloss would use. */
const IRREGULAR: Record<string, string> = {
  ate: 'eat', eaten: 'eat', went: 'go', gone: 'go', goes: 'go', saw: 'see', seen: 'see', did: 'do', done: 'do',
  does: 'do', had: 'have', has: 'have', made: 'make', said: 'say', took: 'take', taken: 'take', came: 'come',
  got: 'get', gotten: 'get', gave: 'give', given: 'give', knew: 'know', known: 'know', thought: 'think',
  bought: 'buy', brought: 'bring', told: 'tell', found: 'find', left: 'leave', felt: 'feel', kept: 'keep',
  met: 'meet', ran: 'run', sat: 'sit', stood: 'stand', spoke: 'speak', spoken: 'speak', wrote: 'write',
  written: 'write', slept: 'sleep', drank: 'drink', drunk: 'drink', sang: 'sing', sung: 'sing', swam: 'swim',
  began: 'begin', begun: 'begin', fell: 'fall', fallen: 'fall', flew: 'fly', flown: 'fly', drove: 'drive',
  driven: 'drive', rode: 'ride', ridden: 'ride', sold: 'sell', sent: 'send', spent: 'spend', taught: 'teach',
  understood: 'understand', won: 'win', wore: 'wear', worn: 'wear', broke: 'break', broken: 'break',
  chose: 'choose', chosen: 'choose', forgot: 'forget', forgotten: 'forget', lost: 'lose', paid: 'pay',
  built: 'build', caught: 'catch', held: 'hold', heard: 'hear', laid: 'lay', lain: 'lie', led: 'lead',
  meant: 'mean', grew: 'grow', grown: 'grow', threw: 'throw', thrown: 'throw', hid: 'hide', hidden: 'hide',
  bit: 'bite', bitten: 'bite', woke: 'wake', woken: 'wake', shot: 'shoot', fought: 'fight', sought: 'seek',
  stole: 'steal', stolen: 'steal', struck: 'strike', hung: 'hang', dug: 'dig', fed: 'feed', fled: 'flee',
  became: 'become', forgave: 'forgive', forgiven: 'forgive', froze: 'freeze', frozen: 'freeze',
  children: 'child', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth', mice: 'mouse', lives: 'life',
  wives: 'wife', knives: 'knife', leaves: 'leaf', better: 'good', best: 'good', worse: 'bad', worst: 'bad',
  older: 'old', elder: 'old', eldest: 'old', me: 'i', my: 'i', mine: 'i', us: 'we', our: 'we', ours: 'we',
  him: 'he', his: 'he', them: 'they', their: 'they', theirs: 'they', your: 'you', yours: 'you',
}

/** Every plausible base form of an English word — crude, but applied to both sides alike. */
function stems(raw: string): string[] {
  const w = raw.toLowerCase()
  const out = new Set([w])
  if (IRREGULAR[w]) out.add(IRREGULAR[w])
  const add = (s: string) => {
    if (s.length >= 3) out.add(s)
  }
  const undouble = (s: string) => (/([b-df-hj-np-tv-z])\1$/.test(s) ? s.slice(0, -1) : s)
  if (w.endsWith('ies')) add(w.slice(0, -3) + 'y')
  if (w.endsWith('es')) add(w.slice(0, -2))
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1))
  for (const suffix of ['ing', 'ed', 'er', 'est']) {
    if (!w.endsWith(suffix)) continue
    const base = w.slice(0, -suffix.length)
    add(base)
    add(base + 'e')
    add(undouble(base))
    if (base.endsWith('i')) add(base.slice(0, -1) + 'y')
  }
  if (w.endsWith('ly')) add(w.slice(0, -2))
  if (w.endsWith('ily')) add(w.slice(0, -3) + 'y')
  return [...out]
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? []
}

/**
 * The stemmed words of a sense that could identify it in a translation.
 * Takes the sense already in plain English (`plainEnglish`).
 */
export function senseKeys(plainSense: string): Set<string> {
  // Parenthesised notes ("(of a person)", "(coll.)") qualify a sense; they don't name it.
  const all = words(plainSense.replace(/\([^)]*\)/g, ' '))
  let content = all.filter((w) => !STOP.has(w))
  if (content.length === 0) content = all.filter((w) => w !== 'to' && w !== 'a' && w !== 'the')
  const keys = new Set<string>()
  for (const w of content) for (const s of stems(w)) keys.add(s)
  return keys
}

/** The stemmed words of a translation, ready for `shows`. */
export function translationStems(translation: string): Set<string> {
  const out = new Set<string>()
  for (const w of words(translation)) for (const s of stems(w)) out.add(s)
  return out
}

/** Whether a translation (as `translationStems`) contains any key of a sense. */
export function shows(keys: Set<string>, translation: Set<string>): boolean {
  for (const k of keys) if (translation.has(k)) return true
  return false
}
