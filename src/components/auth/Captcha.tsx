import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Platform, View } from 'react-native'
import type { ViewInstance } from 'react-native'
import type { WebView as WebViewType, WebViewMessageEvent } from 'react-native-webview'

/*
 * Cloudflare Turnstile, for Supabase's "Enable CAPTCHA protection".
 *
 * Once that switch is on, Supabase refuses sign-up, password sign-in, Apple's
 * ID-token sign-in and password-reset requests that don't carry a fresh token —
 * so every one of those calls in the app passes `captcha.token`. Until a site
 * key is set this whole module is inert: `enabled` is false, the widget renders
 * nothing, and the token is undefined, which is exactly what Supabase expects
 * while protection is off. Turn the two on together (see supabase/README.md).
 *
 * Tokens are single-use. Every caller resets after a request, pass or fail.
 */

const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? ''
/*
 * Turnstile checks the page's hostname against the widget's allowlist. A
 * native WebView has no real origin, so it is given this one as its base URL —
 * it must be on the widget's hostname list in Cloudflare.
 */
const NATIVE_HOSTNAME = process.env.EXPO_PUBLIC_TURNSTILE_HOSTNAME || 'chineseeasy.app'
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export const captchaEnabled = SITE_KEY.length > 0

export interface Captcha {
  enabled: boolean
  /** Undefined until solved, and again after `reset`. */
  token: string | undefined
  /** True when a request may go: protection is off, or a token is in hand. */
  ready: boolean
  /** Render this on the form. Nothing at all when protection is off. */
  widget: ReactNode
  reset: () => void
}

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

let scriptPromise: Promise<void> | null = null
function loadTurnstileScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('turnstile script failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

function WebWidget({ onToken, resetKey }: { onToken: (token: string | undefined) => void; resetKey: number }) {
  const hostRef = useRef<ViewInstance>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadTurnstileScript()
      .then(() => {
        const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile
        // react-native-web hands back the DOM node for a View's ref.
        const el = hostRef.current as unknown as HTMLElement | null
        if (cancelled || !api || !el) return
        widgetId.current = api.render(el, {
          sitekey: SITE_KEY,
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(undefined),
          'error-callback': () => onToken(undefined),
        })
      })
      .catch(() => onToken(undefined))
    return () => {
      cancelled = true
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile
      if (api && widgetId.current) api.remove(widgetId.current)
      widgetId.current = null
    }
  }, [onToken])

  useEffect(() => {
    if (resetKey === 0) return
    const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile
    if (api && widgetId.current) api.reset(widgetId.current)
  }, [resetKey])

  return <View ref={hostRef} style={{ alignItems: 'center', minHeight: 65 }} />
}

const nativeHtml = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:transparent;display:flex;justify-content:center}</style>
<script src="${SCRIPT_URL}"></script></head><body><div id="w"></div><script>
function send(t){window.ReactNativeWebView.postMessage(JSON.stringify({token:t||null}))}
function go(){if(!window.turnstile)return setTimeout(go,100);
window.__id=turnstile.render('#w',{sitekey:${JSON.stringify(SITE_KEY)},callback:send,
'expired-callback':function(){send(null)},'error-callback':function(){send(null)}})}
go();</script></body></html>`

function NativeWidget({ onToken, resetKey }: { onToken: (token: string | undefined) => void; resetKey: number }) {
  const ref = useRef<ComponentRef<typeof WebViewType>>(null)
  // Required lazily, as speechRecognition does: keeps the web bundle free of it.
  const { WebView } = require('react-native-webview') as typeof import('react-native-webview')

  useEffect(() => {
    if (resetKey === 0) return
    ref.current?.injectJavaScript('window.turnstile&&window.turnstile.reset(window.__id);true;')
  }, [resetKey])

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const { token } = JSON.parse(event.nativeEvent.data) as { token: string | null }
      onToken(token ?? undefined)
    } catch {
      onToken(undefined)
    }
  }

  return (
    <View style={{ height: 70, alignSelf: 'stretch' }}>
      <WebView
        ref={ref}
        source={{ html: nativeHtml, baseUrl: `https://${NATIVE_HOSTNAME}` }}
        onMessage={onMessage}
        originWhitelist={['*']}
        scrollEnabled={false}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  )
}

export function useCaptcha(): Captcha {
  const [token, setToken] = useState<string | undefined>(undefined)
  const [resetKey, setResetKey] = useState(0)
  const onToken = useCallback((next: string | undefined) => setToken(next), [])

  const reset = useCallback(() => {
    if (!captchaEnabled) return
    setToken(undefined)
    setResetKey((k) => k + 1)
  }, [])

  const widget = !captchaEnabled ? null : Platform.OS === 'web' ? (
    <WebWidget onToken={onToken} resetKey={resetKey} />
  ) : (
    <NativeWidget onToken={onToken} resetKey={resetKey} />
  )

  return { enabled: captchaEnabled, token, ready: !captchaEnabled || token !== undefined, widget, reset }
}
