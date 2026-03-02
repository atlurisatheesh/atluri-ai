# Distributed Scaling Architecture

## Executive Summary

This document defines the production architecture for scaling the Interview Copilot voice system from single-instance to multi-region distributed deployment. It addresses WebSocket session affinity, Deepgram connection pooling, Redis pub/sub fanout, and horizontal scaling patterns.

**Target Scale:**
- 10,000 concurrent sessions per region
- 99.9% uptime SLA
- <500ms p95 trigger-to-answer latency
- Multi-region active-active deployment

---

## Current Architecture (Single Instance)

```
┌─────────────────────────────────────────────────────────────┐
│                     Single Server                            │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐   │
│  │ FastAPI │───│ WS Voice │───│ Deepgram │───│ OpenAI  │   │
│  │ :9010   │   │  Router  │   │  Stream  │   │ Stream  │   │
│  └─────────┘   └──────────┘   └──────────┘   └─────────┘   │
│                      │                                       │
│               ┌──────┴──────┐                               │
│               │ In-Memory   │                               │
│               │ Room State  │                               │
│               └─────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

**Limitations:**
- Single point of failure
- Memory-bound session limit (~500 concurrent)
- No horizontal scaling
- No failover capability

---

## Target Architecture (Distributed)

```
                              ┌─────────────────┐
                              │   CloudFlare    │
                              │   (Global LB)   │
                              └────────┬────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     US-WEST-2                    US-EAST-1                 EU-WEST-1
         │                            │                         │
    ┌────┴────┐                  ┌────┴────┐               ┌────┴────┐
    │   ALB   │                  │   ALB   │               │   ALB   │
    │ (Sticky │                  │ (Sticky │               │ (Sticky │
    │Sessions)│                  │Sessions)│               │Sessions)│
    └────┬────┘                  └────┬────┘               └────┴────┘
         │                            │                         │
    ┌────┴────────────┐         ┌────┴────────────┐       ┌────┴────────────┐
    │ ┌─────┐ ┌─────┐ │         │ ┌─────┐ ┌─────┐ │       │ ┌─────┐ ┌─────┐ │
    │ │WS-1 │ │WS-2 │ │         │ │WS-1 │ │WS-2 │ │       │ │WS-1 │ │WS-2 │ │
    │ └──┬──┘ └──┬──┘ │         │ └──┬──┘ └──┬──┘ │       │ └──┬──┘ └──┬──┘ │
    │    │       │    │         │    │       │    │       │    │       │    │
    │    └───┬───┘    │         │    └───┬───┘    │       │    └───┬───┘    │
    │        │        │         │        │        │       │        │        │
    │   ┌────┴────┐   │         │   ┌────┴────┐   │       │   ┌────┴────┐   │
    │   │ Redis   │◄──┼─────────┼──►│ Redis   │◄──┼───────┼──►│ Redis   │   │
    │   │ Cluster │   │         │   │ Cluster │   │       │   │ Cluster │   │
    │   └─────────┘   │         │   └─────────┘   │       │   └─────────┘   │
    └─────────────────┘         └─────────────────┘       └─────────────────┘
              │                           │                         │
              └───────────────────────────┼─────────────────────────┘
                                          │
                              ┌───────────┴───────────┐
                              │    Deepgram Pool      │
                              │  (Shared Connection)  │
                              └───────────────────────┘
```

---

## Component Deep Dive

### 1. Load Balancer Configuration

**ALB Settings (AWS Application Load Balancer):**

```yaml
# alb-config.yaml
listener:
  protocol: HTTPS
  port: 443
  
target_group:
  protocol: HTTP
  port: 9010
  health_check:
    path: /health
    interval: 10
    timeout: 5
    healthy_threshold: 2
    unhealthy_threshold: 3
    
stickiness:
  enabled: true
  type: lb_cookie
  duration_seconds: 86400  # 24 hours
  
# WebSocket-specific
idle_timeout: 3600  # 1 hour for long-running WS
```

**Why Sticky Sessions:**
- WebSocket connections are stateful
- Session state lives in memory on specific instance
- Breaking stickiness = losing session context
- Cookie-based stickiness survives client reconnects

**Failure Mode:**
- If target instance dies, ALB routes to new instance
- Client must reconnect and rebuild session
- Acceptable for interview sessions (user restarts anyway)

---

### 2. Redis Architecture

**Deployment Model: Redis Cluster with Pub/Sub**

```yaml
# redis-cluster.yaml
cluster:
  nodes: 6  # 3 masters, 3 replicas
  replication_factor: 1
  
memory:
  maxmemory: 4gb
  maxmemory_policy: volatile-lru
  
pubsub:
  # Channel pattern for room events
  channels:
    - "room:{room_id}:events"
    - "session:{session_id}:control"
    - "global:metrics"
```

**Data Partitioning:**

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `room:{id}:state` | Room active question, participants | 24h |
| `room:{id}:transcript` | Transcript buffer | 6h |
| `session:{id}:vad` | VAD threshold state | 2h |
| `pregen:{hash}` | Speculative generation cache | 5m |
| `embed:{hash}` | Embedding cache | 1h |

**Pub/Sub Channels:**

```python
# Room event fanout
await redis.publish(f"room:{room_id}:events", json.dumps({
    "type": "interviewer_question",
    "question": "Tell me about yourself",
    "from_instance": INSTANCE_ID,
}))

# Cross-instance session control
await redis.publish(f"session:{session_id}:control", json.dumps({
    "type": "force_disconnect",
    "reason": "duplicate_session",
}))
```

---

### 3. WebSocket Instance Architecture

**Instance Configuration:**

```yaml
# instance-config.yaml
resources:
  cpu: 4 vCPU
  memory: 8 GB
  
limits:
  max_connections: 500
  max_rooms: 200
  connection_timeout_sec: 3600
  
scaling:
  min_instances: 2
  max_instances: 20
  target_cpu: 60%
  target_connections: 400
  scale_up_cooldown: 60
  scale_down_cooldown: 300
```

**Per-Instance Components:**

```
┌─────────────────────────────────────────────────────────────┐
│                    WS Instance                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Connection   │  │ Deepgram    │  │ OpenAI       │       │
│  │ Manager      │  │ Pool (10)   │  │ Pool (5)     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │               │
│  ┌──────┴─────────────────┴─────────────────┴──────┐        │
│  │              Session Router                      │        │
│  └──────────────────────┬───────────────────────────┘        │
│                         │                                    │
│  ┌──────────────────────┴───────────────────────────┐        │
│  │           Local Cache (LRU 100MB)                │        │
│  │  - Embeddings                                     │        │
│  │  - Recent transcripts                             │        │
│  │  - VAD thresholds                                 │        │
│  └──────────────────────────────────────────────────┘        │
│                         │                                    │
│  ┌──────────────────────┴───────────────────────────┐        │
│  │           Redis Client (Async)                    │        │
│  └──────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Deepgram Connection Strategy

**Problem:** Deepgram WebSocket connections are expensive to establish (~200ms).

**Solution:** Connection pooling with warm connections.

```python
class DeepgramPool:
    """
    Pool of warm Deepgram connections.
    
    Strategy:
    1. Maintain N warm connections (idle, ready to use)
    2. When session starts, acquire from pool
    3. When session ends, return to pool (if healthy)
    4. Background task maintains pool size
    """
    
    def __init__(
        self,
        pool_size: int = 10,
        max_connection_age_sec: float = 300,  # Recycle every 5 min
    ):
        self.pool_size = pool_size
        self.max_age = max_connection_age_sec
        self._available: asyncio.Queue = asyncio.Queue()
        self._in_use: Dict[str, DeepgramConnection] = {}
        
    async def acquire(self, session_id: str) -> DeepgramConnection:
        """Get a warm connection from pool"""
        try:
            conn = await asyncio.wait_for(
                self._available.get(),
                timeout=0.1
            )
            # Check health
            if conn.is_healthy() and conn.age_sec < self.max_age:
                self._in_use[session_id] = conn
                return conn
            else:
                # Recycle unhealthy connection
                await conn.close()
        except asyncio.TimeoutError:
            pass
        
        # Create new if pool empty
        conn = await DeepgramConnection.create()
        self._in_use[session_id] = conn
        return conn
    
    async def release(self, session_id: str):
        """Return connection to pool"""
        conn = self._in_use.pop(session_id, None)
        if conn and conn.is_healthy() and self._available.qsize() < self.pool_size:
            await conn.reset()  # Clear state
            await self._available.put(conn)
        elif conn:
            await conn.close()
```

---

### 5. Horizontal Scaling Triggers

**Auto-Scaling Policy:**

```yaml
# autoscaling-policy.yaml
metrics:
  - name: websocket_connections
    threshold: 400
    scale_up_delta: 2
    scale_down_delta: 1
    
  - name: cpu_utilization
    threshold: 70
    scale_up_delta: 1
    scale_down_delta: 1
    
  - name: event_loop_lag_ms
    threshold: 50
    scale_up_delta: 2  # Aggressive
    scale_down_delta: 0  # Don't scale down on this
    
  - name: deepgram_pool_exhaustion
    threshold: 0.8  # 80% pool used
    scale_up_delta: 1
    scale_down_delta: 0

cooldowns:
  scale_up: 60  # 1 minute
  scale_down: 300  # 5 minutes
```

**Graceful Scale-Down:**

```python
async def graceful_shutdown():
    """
    Graceful shutdown for scale-down events.
    
    1. Stop accepting new connections
    2. Wait for existing sessions to complete (with timeout)
    3. Force disconnect remaining sessions
    4. Close all pools
    """
    # Mark unhealthy to stop new connections
    health_status.set_draining()
    
    # Wait for sessions with timeout
    timeout = 120  # 2 minutes
    start = time.time()
    
    while active_sessions() > 0 and (time.time() - start) < timeout:
        await asyncio.sleep(5)
        logger.info("Draining: %d sessions remaining", active_sessions())
    
    # Force disconnect remaining
    for session in get_all_sessions():
        await session.disconnect(reason="instance_shutdown")
    
    # Close pools
    await deepgram_pool.close_all()
    await redis_client.close()
```

---

### 6. Cross-Region Architecture

**Active-Active Multi-Region:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Traffic Manager                    │
│                    (Latency-Based Routing)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   US-WEST-2          US-EAST-1          EU-WEST-1
        │                  │                  │
   ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
   │ Cluster │        │ Cluster │        │ Cluster │
   │ (5-20   │        │ (5-20   │        │ (5-20   │
   │ nodes)  │        │ nodes)  │        │ nodes)  │
   └────┬────┘        └────┬────┘        └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
              ┌────────────┴────────────┐
              │    Redis Global Sync    │
              │    (Eventual, ~50ms)    │
              └─────────────────────────┘
```

**Region Isolation:**
- Each region is fully independent
- No cross-region dependencies for real-time path
- Global Redis sync for analytics/state only
- User sessions always stay in originating region

**Failover:**
1. Health check fails in region
2. GTM removes region from rotation
3. New connections route to nearest healthy region
4. Existing connections: client-side reconnect

---

## Capacity Planning

### Per-Instance Limits

| Resource | Limit | Reason |
|----------|-------|--------|
| WebSocket connections | 500 | File descriptor limit + memory |
| Deepgram streams | 50 | Connection overhead |
| OpenAI concurrent | 20 | Rate limit sharing |
| Memory | 6GB usable | Leave headroom for GC |
| CPU | 80% sustained | Avoid latency spikes |

### Scaling Formula

```
instances_needed = ceil(concurrent_sessions / 400)

# Example: 5000 concurrent sessions
instances_needed = ceil(5000 / 400) = 13 instances

# Add 25% headroom
instances_with_buffer = ceil(13 * 1.25) = 17 instances
```

### Cost Projection (AWS)

| Sessions | Instances | Instance Type | Monthly Cost |
|----------|-----------|---------------|--------------|
| 1,000 | 3 | c6i.xlarge | $370 |
| 5,000 | 15 | c6i.xlarge | $1,850 |
| 10,000 | 30 | c6i.xlarge | $3,700 |
| 50,000 | 150 | c6i.xlarge | $18,500 |

*Excludes Deepgram, OpenAI, Redis, ALB costs*

---

## Migration Path

### Phase 1: Redis Integration (Week 1-2)
- Add Redis for room state
- Keep in-memory as fallback
- No scaling yet

### Phase 2: Connection Pooling (Week 3-4)
- Implement Deepgram pool
- Implement embedding cache in Redis
- Add graceful shutdown

### Phase 3: Multi-Instance (Week 5-6)
- Deploy behind ALB
- Enable sticky sessions
- Test with 2-3 instances

### Phase 4: Auto-Scaling (Week 7-8)
- Configure scaling policies
- Load test at target scale
- Tune thresholds

### Phase 5: Multi-Region (Week 9-12)
- Deploy to second region
- Configure GTM
- Test failover

---

## Monitoring & Alerting

### Critical Metrics

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Instance count | <min+1 | <min | Scale up |
| Connection per instance | >400 | >480 | Scale up |
| Event loop lag | >50ms | >100ms | Scale up / investigate |
| Redis latency | >10ms | >50ms | Check Redis health |
| Deepgram pool exhaustion | >70% | >90% | Scale up |
| Error rate | >0.1% | >1% | Page on-call |

### Dashboards

1. **Cluster Overview**: Instance count, total connections, regional distribution
2. **Instance Health**: Per-instance CPU, memory, connections, event loop lag
3. **Session Metrics**: p50/p95/p99 latency, trigger distribution, VAD quality
4. **External Services**: Deepgram latency, OpenAI latency, Redis latency

---

## Disaster Recovery

### Backup Strategy

| Data | Frequency | Retention | Recovery Time |
|------|-----------|-----------|---------------|
| Session transcripts | Real-time (Redis) | 6 hours | Instant |
| User preferences | Daily | 30 days | <1 hour |
| Analytics data | Hourly | 90 days | <4 hours |

### Recovery Procedures

1. **Single Instance Failure**: Auto-healed by ALB + ASG
2. **Redis Failure**: Automatic failover to replica
3. **Region Failure**: GTM routes to surviving region
4. **Global Outage**: Manual intervention required

---

## Security Considerations

### Network Security

```yaml
# Security groups
websocket_sg:
  ingress:
    - port: 443
      source: alb_sg
  egress:
    - port: 443
      destination: 0.0.0.0/0  # Deepgram, OpenAI

redis_sg:
  ingress:
    - port: 6379
      source: websocket_sg
  egress: []  # No outbound

alb_sg:
  ingress:
    - port: 443
      source: 0.0.0.0/0
  egress:
    - port: 9010
      destination: websocket_sg
```

### Data Protection

- All WebSocket connections over TLS 1.3
- Redis in-transit encryption enabled
- No PII stored in Redis (session IDs only)
- Transcripts auto-expire after 6 hours

---

## Conclusion

This architecture enables:
- **10,000+ concurrent sessions** per region
- **99.9% availability** with multi-AZ deployment
- **<500ms p95 latency** maintained under load
- **Linear cost scaling** with usage
- **Zero-downtime deployments** via rolling updates

The phased migration path allows incremental validation while maintaining production stability.
