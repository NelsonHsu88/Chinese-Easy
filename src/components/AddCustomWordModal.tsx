import { useState, type ReactNode } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { Modal } from './Modal'
import { useApp } from '../context/AppContext'

interface Props {
  onClose: () => void
}

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white'

export function AddCustomWordModal({ onClose }: Props) {
  const { addCustomWord } = useApp()
  const [word, setWord] = useState('')
  const [pinyin, setPinyin] = useState('')
  const [definition, setDefinition] = useState('')
  const [exampleSimplified, setExampleSimplified] = useState('')
  const [exampleTranslation, setExampleTranslation] = useState('')

  const canSubmit = word.trim().length > 0 && definition.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    addCustomWord({
      simplified: word.trim(),
      traditional: word.trim(),
      pinyin: pinyin.trim(),
      definition: definition.trim(),
      exampleSimplified: exampleSimplified.trim(),
      exampleTraditional: exampleSimplified.trim(),
      examplePinyin: '',
      exampleTranslation: exampleTranslation.trim(),
    })
    onClose()
  }

  return (
    <Modal title="Add Custom Word" onClose={onClose}>
      <View className="gap-3">
        <Field label="Chinese word (Traditional)">
          <TextInput className={`${inputClasses} font-hanzi text-xl`} value={word} onChangeText={setWord} placeholder="你好" />
        </Field>
        <Field label="Pinyin">
          <TextInput className={inputClasses} value={pinyin} onChangeText={setPinyin} placeholder="nǐ hǎo" />
        </Field>
        <Field label="Definition">
          <TextInput className={inputClasses} value={definition} onChangeText={setDefinition} placeholder="hello" />
        </Field>
        <Field label="Example sentence (optional)">
          <TextInput
            className={`${inputClasses} font-hanzi`}
            value={exampleSimplified}
            onChangeText={setExampleSimplified}
            placeholder="你好吗？"
          />
        </Field>
        <Field label="Example translation (optional)">
          <TextInput className={inputClasses} value={exampleTranslation} onChangeText={setExampleTranslation} placeholder="How are you?" />
        </Field>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`mt-2 w-full items-center rounded-2xl bg-brand-500 py-3.5 shadow-card ${!canSubmit ? 'opacity-40' : ''}`}
        >
          <Text className="text-lg font-bold text-white">Add to Review Deck</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
      {children}
    </View>
  )
}
