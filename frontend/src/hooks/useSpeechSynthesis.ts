import { useRef, useEffect, useCallback, useState } from 'react'

interface SpeechSettings {
  rate: number
  pitch: number
  volume: number
  lang: string
}

const useSpeechSynthesis = () => {
  const voices = useRef<SpeechSynthesisVoice[]>([])
  const selectedVoice = useRef<SpeechSynthesisVoice | null>(null)
  const queue = useRef<string[]>([])
  const isActive = useRef(false)
  const buffer = useRef('')
  const settings = useRef<SpeechSettings>({
    rate: 0.88,
    pitch: 1.05,
    volume: 0.92,
    lang: 'en',
  })
  const [isSpeakingState, setIsSpeakingState] = useState(false)
  const onDoneCallback = useRef<(() => void) | null>(null)

  const selectBestVoice = useCallback(
    (voiceList: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null => {
      if (!voiceList.length) return null
      const priority: ((v: SpeechSynthesisVoice) => boolean)[] = [
        (v) => v.name === 'Google UK English Female',
        (v) => v.name === 'Google US English',
        (v) =>
          v.name.includes('Microsoft') &&
          v.name.includes('Natural') &&
          v.lang.startsWith('en'),
        (v) => v.name === 'Samantha',
        (v) => v.lang.startsWith(lang) && v.name.toLowerCase().includes('female'),
        (v) => v.lang.startsWith(lang),
        (v) => v.lang.startsWith('en'),
        () => true,
      ]
      for (const check of priority) {
        const found = voiceList.find(check)
        if (found) return found
      }
      return voiceList[0]
    },
    []
  )

  const loadVoices = useCallback(() => {
    const v = window.speechSynthesis.getVoices()
    if (v.length > 0) {
      voices.current = v
      selectedVoice.current = selectBestVoice(v, settings.current.lang)
    }
  }, [selectBestVoice])

  useEffect(() => {
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [loadVoices])

  // Chrome anti-pause bug fix — ping every 10s while speaking
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        window.speechSynthesis.speaking &&
        !window.speechSynthesis.paused
      ) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const cleanTextForSpeech = (text: string): string =>
    text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/📞|💬|🌐|💙|💜|🌱|✦|→|←|📷|🎙|🆘/g, '')
      .replace(/\n\n/g, '. ')
      .replace(/\n/g, ', ')
      .replace(/[•\-]\s/g, ', ')
      .replace(/\s+/g, ' ')
      .trim()

  // Forward declare speakNext so speakSentence can call it
  const speakNextRef = useRef<(() => void) | null>(null)

  const speakSentence = useCallback((text: string) => {
    if (!text.trim()) {
      speakNextRef.current?.()
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = selectedVoice.current
    utterance.rate = settings.current.rate
    utterance.pitch = settings.current.pitch
    utterance.volume = settings.current.volume
    utterance.onstart = () => setIsSpeakingState(true)
    utterance.onend = () => speakNextRef.current?.()
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (e.error !== 'interrupted') speakNextRef.current?.()
    }
    // Chrome fix: cancel then speak with a short delay
    window.speechSynthesis.cancel()
    setTimeout(() => window.speechSynthesis.speak(utterance), 80)
  }, [])

  const speakNext = useCallback(() => {
    if (queue.current.length === 0) {
      isActive.current = false
      setIsSpeakingState(false)
      onDoneCallback.current?.()
      return
    }
    isActive.current = true
    const next = queue.current.shift()!
    speakSentence(next)
  }, [speakSentence])

  // Wire forward ref
  useEffect(() => {
    speakNextRef.current = speakNext
  }, [speakNext])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    queue.current = []
    buffer.current = ''
    isActive.current = false
    setIsSpeakingState(false)
  }, [])

  /**
   * Called with each streaming chunk — buffers text and speaks
   * sentence-by-sentence as text arrives in real time.
   */
  const addChunk = useCallback(
    (chunk: string) => {
      buffer.current += chunk
      const sentences = buffer.current.match(/[^.!?]+[.!?]+\s*/g)
      if (sentences) {
        const isLastComplete = /[.!?]\s*$/.test(
          sentences[sentences.length - 1]
        )
        const toSpeak = isLastComplete
          ? sentences
          : sentences.slice(0, -1)
        buffer.current = isLastComplete
          ? ''
          : sentences[sentences.length - 1]
        toSpeak.forEach((s) => {
          const clean = cleanTextForSpeech(s)
          if (clean) queue.current.push(clean)
        })
        if (!isActive.current) speakNext()
      }
    },
    [speakNext]
  )

  /** Flush remaining buffer text after streaming ends */
  const flushBuffer = useCallback(() => {
    if (buffer.current.trim()) {
      const clean = cleanTextForSpeech(buffer.current)
      if (clean) queue.current.push(clean)
      buffer.current = ''
      if (!isActive.current) speakNext()
    }
  }, [speakNext])

  /** Speak a complete text string (resets queue) */
  const speak = useCallback(
    (text: string) => {
      stop()
      const clean = cleanTextForSpeech(text)
      const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean]
      queue.current = sentences.map((s) => s.trim()).filter(Boolean)
      speakNext()
    },
    [speakNext, stop]
  )

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
  }, [])

  const resume = useCallback(() => {
    window.speechSynthesis.resume()
  }, [])

  const switchLanguage = useCallback(
    (lang: string) => {
      stop()
      settings.current.lang = lang
      selectedVoice.current = selectBestVoice(voices.current, lang)
    },
    [stop, selectBestVoice]
  )

  const onDone = useCallback((cb: () => void) => {
    onDoneCallback.current = cb
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    addChunk,
    flushBuffer,
    switchLanguage,
    onDone,
    isSpeaking: isSpeakingState,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    setRate: (r: number) => {
      settings.current.rate = r
    },
    setVolume: (v: number) => {
      settings.current.volume = v
    },
    setPitch: (p: number) => {
      settings.current.pitch = p
    },
    setVoice: (v: SpeechSynthesisVoice) => {
      selectedVoice.current = v
    },
    getVoices: () => voices.current,
  }
}

export default useSpeechSynthesis
