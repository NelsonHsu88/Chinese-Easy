import type { BasicsStep } from '../../../data/basics/types'
import type { Gate, StepProps } from '../lessonParts'
import { DialogueStep, ExplainStep, ListenStep, RecapStep } from './InfoSteps'
import { ChoiceStep } from './ChoiceStep'
import { SoundStep, SymbolChartStep, SyllableBuilderStep, SyllablePartsStep, TonesStep } from './SoundSteps'
import { SentenceBuilderStep } from './SentenceBuilderStep'
import { CharacterExplorerStep } from './CharacterExplorerStep'
import { StrokePickerStep, StrokeStep } from './StrokeSteps'

/** Draws one lesson step. Each kind has one renderer. */
export function StepView(props: StepProps<BasicsStep>) {
  const { step } = props
  switch (step.kind) {
    case 'explain':
      return <ExplainStep {...props} step={step} />
    case 'listen':
      return <ListenStep {...props} step={step} />
    case 'dialogue':
      return <DialogueStep {...props} step={step} />
    case 'recap':
      return <RecapStep {...props} step={step} />
    case 'choice':
      return <ChoiceStep {...props} step={step} />
    case 'sound':
      return <SoundStep {...props} step={step} />
    case 'symbol-chart':
      return <SymbolChartStep {...props} step={step} />
    case 'syllable-parts':
      return <SyllablePartsStep {...props} step={step} />
    case 'tones':
      return <TonesStep {...props} step={step} />
    case 'syllable-builder':
      return <SyllableBuilderStep {...props} step={step} />
    case 'sentence-builder':
      return <SentenceBuilderStep {...props} step={step} />
    case 'character-explorer':
      return <CharacterExplorerStep {...props} step={step} />
    case 'stroke':
      return <StrokeStep {...props} step={step} />
    case 'stroke-picker':
      return <StrokePickerStep {...props} step={step} />
  }
}

/**
 * The bottom button before a step has said anything — closed for steps that
 * must be answered or explored, so a quick tap can't skip past one in the
 * frame before it reports.
 */
export function initialGate(step: BasicsStep): Gate {
  switch (step.kind) {
    case 'choice':
    case 'sentence-builder':
      return { label: 'Check', enabled: false }
    case 'syllable-builder':
    case 'syllable-parts':
    case 'tones':
    case 'character-explorer':
      return { label: 'Continue', enabled: false }
    case 'stroke':
      return { label: step.guidance === 'watch' ? 'Continue' : 'Skip for now', enabled: true }
    default:
      return { label: 'Continue', enabled: true }
  }
}

/** Whether a step is a check that counts toward the lesson's result. */
export function isGraded(step: BasicsStep): boolean {
  return step.kind === 'choice' || step.kind === 'sentence-builder'
}
