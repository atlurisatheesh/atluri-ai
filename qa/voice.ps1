Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

Write-Host "Interviewer speaking..."
$synth.Speak("Okay fine. Lets move to the verbal whiteboard. Walk me through your distributed systems design for a global payment processor.")
Start-Sleep -Seconds 1
$synth.Speak("Actually wait, specifically focus on how you guarantee idempotency in the message consumers when Kafka partitions rebalance.")

Write-Host "Waiting 6 seconds for AI response to generate..."
Start-Sleep -Seconds 6

Write-Host "Candidate answering..."
$synth.Speak("To guarantee idempotency during a partition rebalance, I shift from a synchronous saga to event driven choreography. We ensure the consumer maintains a dedicated state store for processed message offsets.")

Write-Host "Simulation complete."
