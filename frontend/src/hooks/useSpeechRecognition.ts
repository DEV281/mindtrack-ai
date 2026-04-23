import { useRef, useState, useCallback, useEffect } from 'react'

const langMap: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  ar: 'ar-SA',
  pt: 'pt-BR',
  de: 'de-DE',
  it: 'it-IT',
  ru: 'ru-RU',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  tr: 'tr-TR',
  nl: 'nl-NL',
  pl: 'pl-PL',
  bn: 'bn-BD',
  ur: 'ur-PK',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ml: 'ml-IN',
  kn: 'kn-IN',
  sw: 'sw-KE',
  id: 'id-ID',
  vi: 'vi-VN',
  th: 'th-TH',
  el: 'el-GR',
  he: 'he-IL',
  fa: 'fa-IR',
  ro: 'ro-RO',
  uk: 'uk-UA',
  hu: 'hu-HU',
  cs: 'cs-CZ',
  sv: 'sv-SE',
  no: 'nb-NO',
  da: 'da-DK',
  fi: 'fi-FI',
}

const useSpeechRecognition = (
  onFinal: (text: string) => void,
  onInterim?: (text: string) => void
) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const shouldRestart = useRef(false)
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const currentLang = useRef('en-US')

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const init = useCallback(
    (lang = 'en') => {
      const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
      if (!SR) return

      const r = new SR()
      r.continuous = true
      r.interimResults = true
      r.lang = langMap[lang] ?? 'en-US'
      r.maxAlternatives = 1
      currentLang.current = r.lang

      r.onresult = (e: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            final += e.results[i][0].transcript
          } else {
            interim += e.results[i][0].transcript
          }
        }
        if (interim) {
          setTranscript(interim)
          onInterim?.(interim)
        }
        if (final) {
          setTranscript('')
          clearTimeout(silenceTimer.current)
          silenceTimer.current = setTimeout(() => {
            onFinal(final.trim())
          }, 1500)
        }
      }

      r.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error === 'no-speech' && shouldRestart.current) {
          recognitionRef.current?.stop()
        } else if (e.error === 'not-allowed') {
          setIsListening(false)
          shouldRestart.current = false
        }
      }

      r.onend = () => {
        if (shouldRestart.current) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start()
            } catch {
              // already started
            }
          }, 250)
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = r
    },
    [onFinal, onInterim]
  )

  const start = useCallback(
    async (lang = 'en') => {
      if (!isSupported) return
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        return
      }
      const targetLang = langMap[lang] ?? 'en-US'
      if (!recognitionRef.current || currentLang.current !== targetLang) {
        init(lang)
      }
      shouldRestart.current = true
      try {
        recognitionRef.current?.start()
        setIsListening(true)
      } catch {
        // already running
      }
    },
    [isSupported, init]
  )

  const stop = useCallback(() => {
    shouldRestart.current = false
    clearTimeout(silenceTimer.current)
    recognitionRef.current?.stop()
    setIsListening(false)
    setTranscript('')
  }, [])

  const restart = useCallback(() => {
    recognitionRef.current?.stop()
    setTimeout(() => {
      if (shouldRestart.current) {
        try {
          recognitionRef.current?.start()
        } catch {
          // already started
        }
      }
    }, 300)
  }, [])

  const switchLanguage = useCallback(
    (lang: string) => {
      const wasListening = isListening
      stop()
      init(lang)
      if (wasListening) {
        setTimeout(() => start(lang), 300)
      }
    },
    [isListening, stop, init, start]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestart.current = false
      clearTimeout(silenceTimer.current)
      recognitionRef.current?.stop()
    }
  }, [])

  return {
    start,
    stop,
    restart,
    switchLanguage,
    isListening,
    transcript,
    isSupported,
  }
}

export default useSpeechRecognition
