import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'chinese-easy:'

export async function loadStored<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function saveStored<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // storage unavailable (quota, corrupted store) — fail silently, state stays in-memory
  }
}
