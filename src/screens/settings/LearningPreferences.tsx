import { useApp } from '../../context/AppContext'
import {
  DetailShell,
  ControlGroup,
  Field,
  ChoiceList,
  NumberField,
} from '../../components/settings/parts'
import type { PhoneticScript, ReviewDirection, ReviewOrder, ScriptMode } from '../../types'

/*
 * Everything about how study *works*, in one place.
 *
 * These are the same seven fields the old Settings screen wrote, with the same
 * names and the same `updateSettings` call — only the shape of the controls has
 * changed. The one thing that is genuinely different is `dailyNewWordLimit`,
 * which moved to My goal: it is the number the learner thinks of as their
 * target, not a study option, and having it in both places would have meant two
 * screens quietly disagreeing about which one owned it.
 */
export function LearningPreferences() {
  const { settings, updateSettings } = useApp()

  return (
    <DetailShell title="Learning preferences">
      <ControlGroup title="Language & script">
        {/*
          A real picker again. This was a LockedRow for as long as the bundled
          stroke data covered traditional forms only — a Simplified option would
          have been a control that silently did nothing, and saying so was more
          use than an absence. buildHanziData.mjs now bundles both scripts for
          the whole learning bank, so the choice is honoured everywhere a word is
          drawn, including writing practice.
        */}
        <Field
          label="Chinese script"
          hint="Which characters words are shown and written in, including the reading library."
        >
          <ChoiceList<ScriptMode>
            value={settings.script}
            onChange={(script) => updateSettings({ script })}
            options={[
              { value: 'traditional', label: 'Traditional', hint: 'Used in Taiwan, Hong Kong and Macau — 學習' },
              { value: 'simplified', label: 'Simplified', hint: 'Used in mainland China and Singapore — 学习' },
            ]}
          />
        </Field>

        <Field
          label="Phonetic system"
          hint="How a word's pronunciation is written on New Words, Review cards and under example sentences."
        >
          <ChoiceList<PhoneticScript>
            value={settings.phoneticScript}
            onChange={(phoneticScript) => updateSettings({ phoneticScript })}
            options={[
              { value: 'pinyin', label: 'Pinyin', hint: 'Roman letters with tone marks — nǐ hǎo' },
              { value: 'zhuyin', label: 'Zhuyin', hint: 'Bopomofo symbols — ㄋㄧˇ ㄏㄠˇ' },
            ]}
          />
        </Field>
      </ControlGroup>

      <ControlGroup title="Review & study">
        <Field label="Review direction">
          <ChoiceList<ReviewDirection>
            value={settings.reviewDirection}
            onChange={(reviewDirection) => updateSettings({ reviewDirection })}
            options={[
              { value: 'recognition', label: 'Recognition', hint: 'See Chinese, recall the meaning' },
              { value: 'production', label: 'Production', hint: 'See English, write the Chinese' },
              { value: 'mixed', label: 'Mixed', hint: 'Both, alternating through the deck' },
            ]}
          />
        </Field>

        <Field label="Review order">
          <ChoiceList<ReviewOrder>
            value={settings.reviewOrder}
            onChange={(reviewOrder) => updateSettings({ reviewOrder })}
            options={[
              { value: 'due', label: 'Due first', hint: 'Longest overdue at the front' },
              { value: 'shuffled', label: 'Shuffled', hint: 'Random, so the order never becomes a cue' },
              { value: 'hardest-first', label: 'Hardest first', hint: 'The cards you keep missing, while you are fresh' },
            ]}
          />
        </Field>

        <Field
          label="Daily review limit"
          hint="How many cards a review session will serve before calling it a day."
        >
          <NumberField
            label="daily review limit"
            value={settings.dailyReviewLimit}
            onChange={(dailyReviewLimit) => updateSettings({ dailyReviewLimit })}
            min={5}
            max={100}
            step={5}
            unit="cards per day"
          />
        </Field>

        <Field
          label="Repetitions after a wrong answer"
          hint="Extra writing reps queued when you grade a card 'Again'."
        >
          <NumberField
            label="repetitions after a wrong answer"
            value={settings.wrongAnswerReps}
            onChange={(wrongAnswerReps) => updateSettings({ wrongAnswerReps })}
            min={1}
            max={10}
            unit={settings.wrongAnswerReps === 1 ? 'rep' : 'reps'}
          />
        </Field>
      </ControlGroup>
    </DetailShell>
  )
}
