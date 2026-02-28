export async function startVoiceStreaming(onTranscript) {
  const ws = new WebSocket("ws://localhost:8000/ws/voice");
  ws.binaryType = "arraybuffer";

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "transcript") {
      onTranscript(data.text, data.is_final);
    }
  };

  await new Promise((r) => (ws.onopen = r));

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const audioContext = new AudioContext({ sampleRate: 16000 });
  await audioContext.audioWorklet.addModule("/audio-processor.js");

  const source = audioContext.createMediaStreamSource(stream);
  const processor = new AudioWorkletNode(audioContext, "pcm-processor");

  processor.port.onmessage = (e) => {
    if (ws.readyState === 1) ws.send(e.data);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return () => {
    ws.close();
    audioContext.close();
    stream.getTracks().forEach((t) => t.stop());
  };
}
