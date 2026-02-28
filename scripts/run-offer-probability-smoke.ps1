param(
  [string]$ApiBase = "http://127.0.0.1:9010",
  [string]$AuthToken = "",
  [switch]$UseUnsignedDevToken,
  [string]$UnsignedUserId = "smoke-user-1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-Base64Url([string]$value) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($value)
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function New-UnsignedJwt([string]$userId) {
  $header = ConvertTo-Base64Url '{"alg":"HS256","typ":"JWT"}'
  $payloadJson = [string]::Format('{{"sub":"{0}","role":"authenticated"}}', $userId)
  $payload = ConvertTo-Base64Url $payloadJson
  $signature = ConvertTo-Base64Url "sig"
  return "$header.$payload.$signature"
}

if ($UseUnsignedDevToken -and [string]::IsNullOrWhiteSpace($AuthToken)) {
  $AuthToken = New-UnsignedJwt $UnsignedUserId
}

if ([string]::IsNullOrWhiteSpace($AuthToken)) {
  Write-Error "Provide -AuthToken '<jwt>' or use -UseUnsignedDevToken against a backend started with ALLOW_UNVERIFIED_JWT_DEV=true."
}

$headers = @{ Authorization = "Bearer $AuthToken" }

$answers = @(
  "I owned migration planning, aligned four teams, and reduced deployment lead time by 37%.",
  "I redesigned caching and query strategy to reduce p95 latency from 420ms to 180ms while cutting infra spend by 18%.",
  "I ran incident command during an outage, restored service in 22 minutes, and implemented guardrails that prevented recurrence."
)

$startBody = @{ role = "behavioral" } | ConvertTo-Json
$start = Invoke-RestMethod -Uri "$ApiBase/api/interview/start" -Method POST -Headers $headers -ContentType "application/json" -Body $startBody
$sessionId = [string]$start.session_id

$last = $null
$maxTurns = 12
for ($turn = 0; $turn -lt $maxTurns; $turn++) {
  $answerText = $answers[$turn % $answers.Count]
  $payload = @{ session_id = $sessionId; answer = $answerText } | ConvertTo-Json
  $last = Invoke-RestMethod -Uri "$ApiBase/api/interview/answer" -Method POST -Headers $headers -ContentType "application/json" -Body $payload
  if ($last.done) { break }
}

if (-not [bool]$last.done) {
  throw "Interview session did not complete within $maxTurns turns; cannot validate share/export endpoints."
}

$offer = Invoke-RestMethod -Uri "$ApiBase/api/user/offer-probability?limit=40" -Method GET -Headers $headers
$offerRepeat = Invoke-RestMethod -Uri "$ApiBase/api/user/offer-probability?limit=40" -Method GET -Headers $headers
$dashboard = Invoke-RestMethod -Uri "$ApiBase/api/dashboard/overview" -Method GET -Headers $headers
$share = Invoke-RestMethod -Uri "$ApiBase/api/session/$sessionId/share" -Method POST -Headers $headers
$public = Invoke-RestMethod -Uri "$ApiBase/api/public/session/$sessionId/snapshot?token=$([uri]::EscapeDataString([string]$share.share_token))" -Method GET
$exportJson = Invoke-RestMethod -Uri "$ApiBase/api/session/$sessionId/export" -Method GET -Headers $headers
$feedbackPayload = @{
  session_id = $sessionId
  offer_probability = [double]$offer.offer_probability
  confidence_band = [string]$offer.confidence_band
  felt_accuracy = $true
  label = "accurate"
} | ConvertTo-Json
$feedback = Invoke-RestMethod -Uri "$ApiBase/api/user/offer-probability/feedback" -Method POST -Headers $headers -ContentType "application/json" -Body $feedbackPayload
$feedbackSummary = Invoke-RestMethod -Uri "$ApiBase/api/user/offer-probability/feedback-summary?limit=50" -Method GET -Headers $headers

$offerVelocity = 0.0
if ($null -ne $offer.improvement_velocity_pp_per_session) {
  $offerVelocity = [double]$offer.improvement_velocity_pp_per_session
}

$result = [ordered]@{
  ok = $true
  api_base = $ApiBase
  session_id = $sessionId
  round_completed = [bool]$last.done
  offer_probability = [double]$offer.offer_probability
  offer_repeat_same = ([double]$offer.offer_probability -eq [double]$offerRepeat.offer_probability)
  offer_confidence_band = [string]$offer.confidence_band
  offer_delta_vs_last = [double]$offer.delta_vs_last_session
  offer_velocity = $offerVelocity
  offer_has_baseline_hint = -not [string]::IsNullOrWhiteSpace([string]$offer.baseline_range_hint)
  offer_has_target_ladder = @($offer.target_ladder).Count -gt 0
  offer_has_how_it_works = -not [string]::IsNullOrWhiteSpace([string]$offer.how_it_works)
  offer_beta_percentile = if ($null -eq $offer.beta_percentile) { $null } else { [double]$offer.beta_percentile }
  offer_beta_cohort_size = if ($null -eq $offer.beta_cohort_size) { $null } else { [int]$offer.beta_cohort_size }
  dashboard_sessions_total = [int]$dashboard.sessions.total
  dashboard_average_score = [double]$dashboard.sessions.average_score
  public_offer_probability = [double]$public.summary.offer_probability
  public_fix_next_count = @($public.summary.what_to_fix_next).Count
  export_has_offer_snapshot = ($null -ne $exportJson.offer_probability_snapshot)
  feedback_logged = ([string]$feedback.status -eq "logged")
  feedback_total = [int]$feedbackSummary.total_feedback
  feedback_accurate_rate_pct = [double]$feedbackSummary.accurate_rate_pct
  share_path = [string]$share.share_path
}

$result | ConvertTo-Json -Depth 6
