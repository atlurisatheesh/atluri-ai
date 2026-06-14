/**
 * Deepgram real-time transcription client for the frontend.
 * Streams audio from the browser microphone to Deepgram WebSocket.
 */

const DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || ''

export interface TranscriptResult {
    text: string
    confidence: number
    isFinal: boolean
    speaker?: number
}

export class DeepgramStream {
    private socket: WebSocket | null = null
    private mediaRecorder: MediaRecorder | null = null
    private stream: MediaStream | null = null
    public onTranscript: ((result: TranscriptResult) => void) | null = null
    public onError: ((error: string) => void) | null = null
    public isActive = false

    async start() {
        if (!DEEPGRAM_KEY) {
            this.onError?.('Deepgram API key not configured')
            return
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en&punctuate=true&diarize=true&interim_results=true`
            this.socket = new WebSocket(wsUrl, ['token', DEEPGRAM_KEY])

            this.socket.onopen = () => {
                this.isActive = true
                this.mediaRecorder = new MediaRecorder(this.stream!, { mimeType: 'audio/webm' })

                this.mediaRecorder.ondataavailable = (e) => {
                    if (this.socket?.readyState === WebSocket.OPEN && e.data.size > 0) {
                        this.socket.send(e.data)
                    }
                }

                this.mediaRecorder.start(250) // send audio every 250ms
            }

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data)
                const alt = data?.channel?.alternatives?.[0]
                if (alt?.transcript) {
                    this.onTranscript?.({
                        text: alt.transcript,
                        confidence: alt.confidence || 0,
                        isFinal: data.is_final || false,
                        speaker: data.channel?.alternatives?.[0]?.words?.[0]?.speaker,
                    })
                }
            }

            this.socket.onerror = () => {
                this.onError?.('Deepgram connection error')
                this.stop()
            }

            this.socket.onclose = () => {
                this.isActive = false
            }
        } catch (err: any) {
            this.onError?.(err.message || 'Failed to access microphone')
        }
    }

    stop() {
        this.isActive = false
        this.mediaRecorder?.stop()
        this.stream?.getTracks().forEach(t => t.stop())
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.close()
        }
        this.socket = null
        this.mediaRecorder = null
        this.stream = null
    }
}
