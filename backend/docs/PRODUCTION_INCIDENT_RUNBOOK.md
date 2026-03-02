# Production Incident Runbook

## Interview Copilot - Operations Manual

**Document Version:** 1.0  
**Last Updated:** February 2026  
**On-Call Rotation:** [CONFIGURE IN PAGERDUTY]  
**Escalation Contact:** [ENGINEERING LEAD]

---

## Quick Reference Card

### Critical Commands

```bash
# Check system health
curl https://api.interviewcopilot.ai/health

# Check active sessions
curl https://api.interviewcopilot.ai/api/observability/dashboard

# Restart service (graceful)
sudo systemctl restart interview-copilot

# Force restart (emergency only)
sudo systemctl kill -s SIGKILL interview-copilot

# Check logs
journalctl -u interview-copilot -f --since "5 minutes ago"

# Redis connectivity
redis-cli -h redis.internal ping

# Check Deepgram status
curl https://status.deepgram.com/api/v2/status.json
```

### Escalation Matrix

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| **SEV1** (Outage) | 5 minutes | On-call → Engineering Lead → CTO |
| **SEV2** (Degraded) | 15 minutes | On-call → Engineering Lead |
| **SEV3** (Minor) | 1 hour | On-call |
| **SEV4** (Low) | 24 hours | Next business day |

---

## Incident Classification

### SEV1 - Critical Outage

**Definition:** Complete service unavailability affecting all users

**Examples:**
- All WebSocket connections failing
- 0% success rate on voice processing
- Backend service not responding
- Database/Redis completely down

**Response:**
1. Page all engineering immediately
2. Enable incident bridge
3. Customer communication within 15 minutes
4. Status page update

### SEV2 - Major Degradation

**Definition:** Significant functionality impaired, workarounds may exist

**Examples:**
- >50% session failures
- Latency >2 seconds p95
- Deepgram/OpenAI partial outage
- One region down (multi-region)

**Response:**
1. Page on-call + engineering lead
2. Assess blast radius
3. Customer communication within 30 minutes
4. Status page update

### SEV3 - Minor Issue

**Definition:** Limited impact, affects subset of users

**Examples:**
- Single feature broken
- <5% session failures
- One instance unhealthy
- Non-critical API errors

**Response:**
1. On-call investigates
2. Create incident ticket
3. Fix within business hours
4. No customer communication required

### SEV4 - Low Priority

**Definition:** No user impact, technical concern

**Examples:**
- Warning-level metrics
- Non-critical log errors
- Performance degradation <10%
- Documentation issues

**Response:**
1. Create ticket
2. Address in next sprint
3. Monitor for escalation

---

## Incident Scenarios

### Scenario 1: WebSocket Connection Storm

**Symptoms:**
- Connection count spiking >500/instance
- Event loop lag >100ms
- Memory increasing rapidly
- Client reconnection loops

**Diagnosis:**

```bash
# Check connection count
curl http://localhost:9010/api/observability/dashboard | jq '.global.active_sessions'

# Check event loop lag
curl http://localhost:9010/api/observability/health | jq '.event_loop_lag_ms'

# Check memory
ps aux | grep uvicorn | awk '{print $6/1024 " MB"}'

# Check for reconnection loops (high churn)
journalctl -u interview-copilot --since "5 minutes ago" | grep -c "session_start"
journalctl -u interview-copilot --since "5 minutes ago" | grep -c "session_end"
```

**Root Causes:**
1. Load balancer health check misconfiguration
2. Client-side reconnection bug
3. DDoS attack
4. Network instability

**Resolution:**

```bash
# Immediate: Enable rate limiting at ALB
aws elbv2 modify-listener-rule --rule-arn $RULE_ARN \
  --actions '[{"Type":"fixed-response","FixedResponseConfig":{"StatusCode":"429"}}]'

# If client bug: Deploy fix
# If DDoS: Enable WAF rules
# If network: Contact AWS support

# Scale up temporarily
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name interview-copilot-asg \
  --desired-capacity 10
```

**Prevention:**
- Connection rate limiting per IP
- Exponential backoff in clients
- Circuit breaker for reconnection

---

### Scenario 2: Deepgram Service Degradation

**Symptoms:**
- STT latency increasing
- Partial results not arriving
- Confidence scores dropping
- `deepgram_error` in logs

**Diagnosis:**

```bash
# Check Deepgram status
curl https://status.deepgram.com/api/v2/status.json

# Check our error rate
journalctl -u interview-copilot --since "10 minutes ago" | grep -c "deepgram.*error"

# Check latency
curl http://localhost:9010/api/observability/dashboard | jq '.latency.stt'
```

**Root Causes:**
1. Deepgram service outage
2. Network connectivity to Deepgram
3. API key rate limiting
4. Deepgram configuration change

**Resolution:**

```bash
# Immediate: Check if Deepgram is down
# If yes: Wait for recovery, notify customers

# If rate limited: Request limit increase
# Contact: support@deepgram.com

# If network: Check VPC/NAT gateway
aws ec2 describe-nat-gateways --query 'NatGateways[*].State'

# Temporary fallback (if implemented):
# Enable Whisper fallback in config
export STT_FALLBACK_ENABLED=true
```

**Communication Template:**

```
Subject: Service Degradation - Voice Processing

We are currently experiencing degraded voice processing performance 
due to issues with our speech-to-text provider.

Impact: Voice-to-text may be slower than normal
ETA: Monitoring, updates every 30 minutes

We apologize for any inconvenience.
```

---

### Scenario 3: OpenAI API Errors

**Symptoms:**
- LLM responses failing
- `openai_error` in logs
- Trigger responses not appearing
- Timeout errors

**Diagnosis:**

```bash
# Check OpenAI status
curl https://status.openai.com/api/v2/status.json

# Check our error rate
journalctl -u interview-copilot --since "10 minutes ago" | grep -c "openai.*error"

# Check for rate limiting
journalctl -u interview-copilot --since "10 minutes ago" | grep "rate_limit"

# Check response latency
curl http://localhost:9010/api/observability/dashboard | jq '.latency.llm'
```

**Root Causes:**
1. OpenAI service outage
2. Rate limit exceeded
3. API key issues
4. Model deprecation

**Resolution:**

```bash
# If outage: Wait, notify customers
# Status: https://status.openai.com

# If rate limited:
# 1. Check current tier
# 2. Request tier upgrade: https://platform.openai.com/account/limits
# 3. Temporarily reduce request rate

# If API key issue:
# 1. Verify key in secrets manager
# 2. Generate new key if compromised
aws secretsmanager get-secret-value --secret-id interview-copilot/openai-api-key

# Temporary: Enable request queuing with backpressure
export OPENAI_MAX_CONCURRENT=5
export OPENAI_QUEUE_ENABLED=true
```

---

### Scenario 4: Memory Leak

**Symptoms:**
- Memory usage climbing over time
- OOM kills in logs
- Performance degradation
- Sessions timing out

**Diagnosis:**

```bash
# Check memory trend
for i in {1..10}; do
  ps aux | grep uvicorn | awk '{print $6/1024 " MB"}'
  sleep 60
done

# Check for OOM events
dmesg | grep -i "out of memory"

# Check object counts (if profiler enabled)
curl http://localhost:9010/api/debug/memory | jq '.object_counts'

# Check GC behavior
journalctl -u interview-copilot --since "1 hour ago" | grep -c "gc.collect"
```

**Root Causes:**
1. Leaked WebSocket connections
2. Unbounded cache growth
3. Circular references
4. Large transcript accumulation

**Resolution:**

```bash
# Immediate: Rolling restart
# (Zero-downtime if behind load balancer)
for instance in $(aws autoscaling describe-auto-scaling-instances \
  --query 'AutoScalingInstances[*].InstanceId' --output text); do
  aws ec2 terminate-instances --instance-ids $instance
  sleep 120  # Wait for replacement
done

# Long-term: Enable memory profiler
# Run weekly memory profiling job
python -m app.qa.memory_profiler --duration 3600 --interval 60 > /tmp/memory_report.json

# Review report for leak sources
cat /tmp/memory_report.json | jq '.recommendations'
```

**Prevention:**
- Weekly memory profiling runs
- Alerting on memory growth rate
- Cache size limits with TTL
- Regular dependency updates

---

### Scenario 5: Redis Failure

**Symptoms:**
- Session state lost on reconnect
- Cache misses increasing
- `redis_error` in logs
- Pub/sub not working

**Diagnosis:**

```bash
# Check Redis health
redis-cli -h redis.internal ping

# Check Redis memory
redis-cli -h redis.internal info memory | grep used_memory_human

# Check connection count
redis-cli -h redis.internal info clients | grep connected_clients

# Check replication status (if cluster)
redis-cli -h redis.internal info replication
```

**Root Causes:**
1. Redis server down
2. Network partition
3. Memory exhaustion
4. Replication lag

**Resolution:**

```bash
# If Redis down:
# 1. Check AWS ElastiCache console
# 2. Trigger failover to replica
aws elasticache modify-replication-group \
  --replication-group-id interview-copilot-redis \
  --primary-cluster-id interview-copilot-redis-002

# If memory exhaustion:
# 1. Clear volatile keys
redis-cli -h redis.internal FLUSHDB ASYNC
# 2. Scale up Redis instance

# If network:
# Check security groups, VPC routing

# Fallback: Enable in-memory mode
export REDIS_FALLBACK_ENABLED=true
```

---

### Scenario 6: Database Connection Pool Exhaustion

**Symptoms:**
- API requests timing out
- `connection_pool_exhausted` errors
- New sessions failing
- Existing sessions working

**Diagnosis:**

```bash
# Check PostgreSQL connections
psql -h postgres.internal -U app -c "SELECT count(*) FROM pg_stat_activity;"

# Check pool status
curl http://localhost:9010/api/debug/db-pool | jq '.active_connections'

# Check for long-running queries
psql -h postgres.internal -U app -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 10;"
```

**Resolution:**

```bash
# Kill long-running queries
psql -h postgres.internal -U app -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE query_start < now() - interval '5 minutes'
AND state != 'idle';"

# Increase pool size (temporary)
export DB_POOL_SIZE=50
sudo systemctl restart interview-copilot

# Long-term: Add connection pooler (PgBouncer)
```

---

### Scenario 7: High Latency (No Errors)

**Symptoms:**
- p95 latency >1 second
- No error increase
- Users complaining of slowness
- Normal error rates

**Diagnosis:**

```bash
# Check latency breakdown
curl http://localhost:9010/api/observability/dashboard | jq '.latency'

# Identify bottleneck
# STT latency high? → Deepgram issue
# LLM latency high? → OpenAI issue
# Total high but components low? → Internal processing

# Check event loop
curl http://localhost:9010/api/observability/health | jq '.event_loop_lag_ms'

# Check CPU
top -b -n 1 | grep uvicorn

# Check network latency to services
time curl -w "@curl-format.txt" -o /dev/null -s https://api.deepgram.com/v1/listen
```

**Root Causes:**
1. External service slowdown
2. CPU saturation
3. Event loop blocking
4. Network congestion

**Resolution:**

```bash
# If CPU: Scale horizontally
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name interview-copilot-asg \
  --desired-capacity $(expr $(cat current-capacity) + 2)

# If event loop blocking: Find blocking code
# Enable asyncio debug mode
export PYTHONASYNCIODEBUG=1

# If external service: Contact provider
# Deepgram: support@deepgram.com
# OpenAI: https://help.openai.com

# If network: Check routing
traceroute api.deepgram.com
```

---

## Monitoring & Alerts

### Alert Definitions

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `HighErrorRate` | error_rate > 1% for 5m | SEV2 | Page on-call |
| `HighLatency` | p95 > 2s for 5m | SEV2 | Page on-call |
| `InstanceDown` | health_check fails 3x | SEV1 | Page all |
| `MemoryHigh` | memory > 80% for 10m | SEV3 | Alert on-call |
| `ConnectionStorm` | conn_rate > 100/s | SEV2 | Page on-call |
| `DeepgramDown` | deepgram_errors > 50% | SEV1 | Page all |
| `OpenAIDown` | openai_errors > 50% | SEV1 | Page all |
| `RedisDown` | redis_ping fails | SEV1 | Page all |

### Dashboard URLs

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| System Health | `/api/observability/health` | Overall status |
| Session Metrics | `/api/observability/dashboard` | Detailed metrics |
| Grafana | `grafana.internal:3000` | Historical graphs |
| PagerDuty | `pagerduty.com/incidents` | Active incidents |

### Log Queries

```bash
# Error spike investigation
journalctl -u interview-copilot --since "1 hour ago" | \
  grep -E "(ERROR|CRITICAL)" | \
  cut -d' ' -f6- | \
  sort | uniq -c | sort -rn | head -20

# Session trace
journalctl -u interview-copilot --since "1 hour ago" | \
  grep "session_id=abc123"

# Latency investigation
journalctl -u interview-copilot --since "1 hour ago" | \
  grep "latency_ms" | \
  awk -F'latency_ms=' '{print $2}' | \
  cut -d' ' -f1 | \
  sort -n | tail -100
```

---

## Rollback Procedures

### Code Rollback

```bash
# Get previous version
PREV_VERSION=$(aws ecr describe-images \
  --repository-name interview-copilot \
  --query 'sort_by(imageDetails,& imagePushedAt)[-2].imageDigest' \
  --output text)

# Update task definition
aws ecs update-service \
  --cluster interview-copilot \
  --service interview-copilot-service \
  --task-definition interview-copilot:$PREV_VERSION \
  --force-new-deployment
```

### Configuration Rollback

```bash
# Restore previous config
aws secretsmanager get-secret-value \
  --secret-id interview-copilot/config \
  --version-id $(aws secretsmanager list-secret-version-ids \
    --secret-id interview-copilot/config \
    --query 'Versions[1].VersionId' --output text) | \
  jq -r '.SecretString' > /tmp/prev-config.json

# Apply previous config
aws secretsmanager put-secret-value \
  --secret-id interview-copilot/config \
  --secret-string file:///tmp/prev-config.json
```

### Feature Flag Toggle

```bash
# Disable problematic feature
curl -X POST http://localhost:9010/api/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"semantic_similarity_enabled": false}'

# Verify
curl http://localhost:9010/api/admin/feature-flags | jq '.semantic_similarity_enabled'
```

---

## Communication Templates

### Customer Communication (SEV1)

```
Subject: Service Disruption - Interview Copilot

We are currently experiencing a service disruption affecting 
voice processing functionality.

Status: INVESTIGATING
Impact: Users may be unable to start new sessions
Start Time: [TIME UTC]

Our engineering team is actively working on resolution. 
We will provide updates every 15 minutes.

Current status: https://status.interviewcopilot.ai
```

### Customer Communication (Resolution)

```
Subject: Service Restored - Interview Copilot

The service disruption has been resolved.

Resolution Time: [TIME UTC]
Total Duration: [X] minutes
Root Cause: [BRIEF DESCRIPTION]

We apologize for any inconvenience caused. 
A detailed post-incident review will be published within 48 hours.

If you continue experiencing issues, please contact support@interviewcopilot.ai
```

---

## Post-Incident Procedures

### Incident Timeline Template

```markdown
## Incident Report: [TITLE]

**Date:** [DATE]
**Duration:** [X] minutes
**Severity:** [SEV1/2/3/4]
**Affected Users:** [NUMBER or PERCENTAGE]

### Timeline (UTC)

| Time | Event |
|------|-------|
| HH:MM | First alert fired |
| HH:MM | On-call acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Service restored |

### Root Cause

[Detailed technical explanation]

### Impact

[User impact description]

### Resolution

[What was done to fix]

### Action Items

| Action | Owner | Due Date |
|--------|-------|----------|
| [Item] | [Name] | [Date] |

### Lessons Learned

1. What went well
2. What could be improved
3. Where we got lucky
```

### Blameless Post-Mortem Checklist

- [ ] Timeline documented with evidence
- [ ] Root cause confirmed (not assumed)
- [ ] All contributing factors identified
- [ ] Customer impact quantified
- [ ] Action items assigned with owners
- [ ] Detection/response improvements identified
- [ ] Prevention measures proposed
- [ ] Post-mortem shared with team

---

## Appendix

### Contact Information

| Role | Name | Contact |
|------|------|---------|
| On-Call Primary | [Rotation] | PagerDuty |
| On-Call Secondary | [Rotation] | PagerDuty |
| Engineering Lead | [Name] | [Phone] |
| CTO | [Name] | [Phone] |
| AWS Support | - | Premium Support |
| Deepgram Support | - | support@deepgram.com |
| OpenAI Support | - | https://help.openai.com |

### Useful Scripts

Located in `/scripts/ops/`:
- `health-check.sh` - Full system health check
- `restart-service.sh` - Graceful restart
- `rollback.sh` - Quick rollback script
- `scale-up.sh` - Emergency scaling
- `clear-cache.sh` - Cache invalidation

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DEBUG_MODE` | Enable debug logging | false |
| `REDIS_FALLBACK_ENABLED` | Use in-memory if Redis down | false |
| `STT_FALLBACK_ENABLED` | Use Whisper fallback | false |
| `OPENAI_MAX_CONCURRENT` | Limit concurrent requests | 20 |
| `GRACEFUL_SHUTDOWN_TIMEOUT` | Shutdown wait time | 120 |

---

*This runbook should be reviewed and updated monthly. Last review: February 2026*
