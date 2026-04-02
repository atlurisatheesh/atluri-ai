Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0

Write-Host "Waiting 10 seconds for user to click START in the Desktop App..."
for ($i=10; $i -gt 0; $i--) {
    Write-Host "$i..."
    Start-Sleep -Seconds 1
}

Write-Host "--- ROUND 1: BEHAVIORAL ---"
$synth.Speak("Hi, let's get started. To begin, can you walk me through your background and tell me why you're a good fit for this Senior role?")

Write-Host "Waiting 10 seconds for Desktop AI to catch and generate answer..."
Start-Sleep -Seconds 10

Write-Host "Candidate answering..."
$synth.Speak("I have 7 years of backend engineering experience, heavily focused on distributed systems. In my last role, I led a migration from a monolith to event-driven microservices that reduced our p99 latency by 60 percent.")

Start-Sleep -Seconds 3

Write-Host "--- ROUND 2: SYSTEM DESIGN ---"
$synth.Speak("Great. Let's move to system design. How would you design a URL shortener like bit-dot-ly that handles 10 billion URLs and 10 million reads per second?")

Write-Host "Waiting 12 seconds for Desktop AI..."
Start-Sleep -Seconds 12

Write-Host "Candidate answering..."
$synth.Speak("For the architecture, I'd use a Base 62 hash to generate short codes. Writes would hit a Postgres cluster, but all reads would be served from a distributed Redis cache with a 24 hour TTL. Finally, a CDN would handle global 3 0 2 redirects to ensure read latency stays under 20 milliseconds.")

Start-Sleep -Seconds 3

Write-Host "--- ROUND 3: CURVEBALL/TRAP ---"
$synth.Speak("Interesting. What happens to your system if the primary Postgres database suffers a catastrophic partition failure during a massive write spike?")

Write-Host "Waiting 10 seconds for Trap Detection and AI..."
Start-Sleep -Seconds 10

Write-Host "Candidate answering..."
$synth.Speak("I would design the system with synchronous replication to a hot standby. If the primary fails, the load balancer automatically promotes the standby. During the failover window, the API would queue incoming writes in an external message queue to guarantee zero data loss.")

Start-Sleep -Seconds 3

Write-Host "--- ROUND 4: CODING / ALGORITHM ---"
$synth.Speak("Okay, last question. In a coding interview, how would you solve the Two Sum problem efficiently, and what is the time complexity?")

Write-Host "Waiting 10 seconds for Code Generation..."
Start-Sleep -Seconds 10

Write-Host "Candidate answering..."
$synth.Speak("I would use a hash map. I'd iterate through the array once, and for each number, check if its target complement already exists in the map. This achieves an Big O of N time complexity and Big O of N space complexity, which is optimal.")

Write-Host "--- SIMULATION COMPLETE ---"
