/**
 * Deepgram real-time transcription client for the frontend.
 * Audio is proxied through the backend WebSocket so the Deepgram API key
 * is never sent to or stored on the client.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const WS_BASE = API_BASE.replace(/^http/, 'ws').replace('/api', '')

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

    async start(authToken?: string) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Connect to our backend proxy — the backend holds the Deepgram key server-side
            const tokenParam = authToken ? `?token=${encodeURIComponent(authToken)}` : ''
            const wsUrl = `${WS_BASE}/ws/transcribe${tokenParam}`
            this.socket = new WebSocket(wsUrl)

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
