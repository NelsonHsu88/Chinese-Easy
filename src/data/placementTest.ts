import { wordById } from './hskFrequency'
import type { VocabWord } from '../types'

const PLACEMENT_IDS = [
  'hsk1-01', 'hsk1-05', 'hsk1-09',
  'hsk2-02', 'hsk2-04', 'hsk2-08',
  'hsk3-02', 'hsk3-05', 'hsk3-08',
  'hsk4-02', 'hsk4-05', 'hsk4-08',
  'hsk5-02', 'hsk5-05', 'hsk5-08',
  'hsk6-02', 'hsk6-05', 'hsk6-08',
]

export const placementItems: VocabWord[] = PLACEMENT_IDS.map((id) => {
  const word = wordById(id)
  if (!word) throw new Error(`Missing placement word ${id} in hskFrequency`)
  return word
})
