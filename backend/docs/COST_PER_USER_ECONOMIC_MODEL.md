# Cost-Per-User Economic Model

## Interview Copilot - Unit Economics Analysis

**Document Version:** 1.0  
**Analysis Date:** February 2026  
**Model Validity:** 6 months (re-evaluate with pricing changes)

---

## Executive Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| **Cost per session** | $0.42 - $0.78 | Sustainable |
| **Cost per user/month** | $2.10 - $3.90 | Healthy margin potential |
| **Break-even price** | $9.99/month | At 3 sessions/week |
| **Target margin** | 70-80% | Achievable at scale |
| **Unit economics verdict** | ✅ VIABLE | Clear path to profitability |

---

## 1. Session Economics Breakdown

### Typical Session Profile

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Session duration | 45 minutes | Average interview length |
| Audio hours | 0.75 hours | Full session audio |
| Interviewer questions | 12 | Typical behavioral interview |
| Triggers fired | 10-15 | ~80% of questions answered |
| LLM tokens (input) | 8,000 | Context + prompt per trigger |
| LLM tokens (output) | 2,400 | ~200 tokens per response |
| Embedding calls | 30 | Semantic matching |

### Cost Components

#### A. Speech-to-Text (Deepgram)

```
Deepgram Nova-2 Pricing: $0.0043/minute (Pay-as-you-go)
Enterprise Pricing: $0.0036/minute (Committed)

Session Audio: 45 minutes
Cost per Session: $0.1935 (PAYG) / $0.162 (Enterprise)
```

| Volume | Price/min | Cost/Session | Monthly (1000 users) |
|--------|-----------|--------------|---------------------|
| PAYG | $0.0043 | $0.19 | $950 |
| Enterprise | $0.0036 | $0.16 | $810 |
| High-volume | $0.0029 | $0.13 | $652 |

**Deepgram Cost Optimization:**
- Batch audio chunks (less WebSocket overhead)
- Use `interim_results: false` when possible
- Negotiate enterprise pricing at 100K+ minutes/month

#### B. LLM Processing (OpenAI)

```
GPT-4o-mini Pricing:
  Input: $0.15 / 1M tokens
  Output: $0.60 / 1M tokens

Per Trigger (avg):
  Input: 800 tokens → $0.00012
  Output: 200 tokens → $0.00012
  Total: $0.00024 per trigger

Per Session (12 triggers):
  Total: $0.00288
```

**Full LLM Cost Breakdown:**

| Component | Tokens | Cost |
|-----------|--------|------|
| Trigger context (12x) | 9,600 in | $0.00144 |
| Trigger response (12x) | 2,400 out | $0.00144 |
| Pre-generation (speculative) | 4,000 in + 1,000 out | $0.00120 |
| Transcript smoothing | 2,000 in + 500 out | $0.00060 |
| **Total LLM/session** | | **$0.00468** |

**Note:** GPT-4o-mini is extremely cost-effective. GPT-4o would cost ~20x more.

#### C. Embedding Computation

```
Local Model (all-MiniLM-L6-v2):
  Compute cost: ~$0.0001 per embedding (GPU amortized)
  30 embeddings/session: $0.003

OpenAI ada-002 Fallback:
  $0.0001 / 1K tokens
  ~100 tokens per embedding × 30 = 3K tokens
  Cost: $0.0003
```

**Embedding Cost/Session:** $0.003 (local) to $0.0003 (API)

#### D. Infrastructure (Compute + Network)

```
EC2 c6i.xlarge (4 vCPU, 8GB RAM):
  On-demand: $0.17/hour
  Reserved (1yr): $0.107/hour
  Spot: $0.051/hour

Capacity: ~400 concurrent sessions per instance
Session duration: 0.75 hours

Cost per session = ($0.107/hour × 0.75 hours) / 400 sessions
                 = $0.0002 per session
```

**Infrastructure per Session:**

| Component | Cost |
|-----------|------|
| EC2 compute | $0.0002 |
| ALB (data transfer) | $0.0001 |
| Redis ElastiCache | $0.0001 |
| CloudWatch/Monitoring | $0.0001 |
| **Total infra/session** | **$0.0005** |

#### E. Total Session Cost

| Tier | Deepgram | LLM | Embedding | Infra | Total |
|------|----------|-----|-----------|-------|-------|
| **PAYG** | $0.19 | $0.005 | $0.003 | $0.001 | **$0.199** |
| **Growth** | $0.16 | $0.005 | $0.001 | $0.001 | **$0.167** |
| **Scale** | $0.13 | $0.005 | $0.001 | $0.001 | **$0.137** |

---

## 2. User Economics

### Usage Patterns

| User Type | Sessions/Week | Sessions/Month |
|-----------|---------------|----------------|
| Light | 1 | 4 |
| Active | 3 | 12 |
| Power | 7 | 28 |
| Weighted Average | 2.5 | 10 |

### Cost per User per Month

| User Type | Sessions | Cost (PAYG) | Cost (Scale) |
|-----------|----------|-------------|--------------|
| Light | 4 | $0.80 | $0.55 |
| Active | 12 | $2.39 | $1.64 |
| Power | 28 | $5.57 | $3.84 |
| **Blended Avg** | 10 | **$1.99** | **$1.37** |

---

## 3. Pricing Strategy

### Competitor Analysis

| Competitor | Price | Offering |
|------------|-------|----------|
| Interview Warmup (Google) | Free | Basic practice |
| Pramp | $0-30/mo | Peer practice |
| interviewing.io | $100-500/session | Human mock |
| Exponent | $99-199/mo | Course + AI |
| **Our Position** | $19.99/mo | Real-time AI assist |

### Recommended Pricing Tiers

| Tier | Price | Sessions | Target User |
|------|-------|----------|-------------|
| **Free** | $0 | 2/month | Trial users |
| **Basic** | $9.99/mo | 8/month | Casual job seekers |
| **Pro** | $19.99/mo | Unlimited | Active job seekers |
| **Team** | $49.99/seat/mo | Unlimited + Analytics | Hiring prep |

### Margin Analysis

| Tier | Revenue | Avg Cost | Gross Margin |
|------|---------|----------|--------------|
| Free | $0 | $0.33 | -$0.33 (CAC) |
| Basic | $9.99 | $1.34 | 86.6% |
| Pro | $19.99 | $1.99 | 90.0% |
| Team | $49.99 | $2.50 | 95.0% |

**Blended gross margin target: 85%+**

---

## 4. Scale Economics

### Volume-Based Cost Reduction

| Monthly Users | Deepgram Rate | Blended Cost/User | Gross Margin @ $19.99 |
|---------------|---------------|-------------------|----------------------|
| 100 | $0.0043 | $2.39 | 88.0% |
| 1,000 | $0.0036 | $1.99 | 90.0% |
| 10,000 | $0.0029 | $1.64 | 91.8% |
| 100,000 | $0.0022 | $1.22 | 93.9% |

### Infrastructure Scaling Costs

| Concurrent | Instances | Monthly Infra | Cost/User (10K users) |
|------------|-----------|---------------|----------------------|
| 100 | 2 | $154 | $0.015 |
| 500 | 3 | $231 | $0.023 |
| 2,000 | 8 | $616 | $0.062 |
| 10,000 | 35 | $2,695 | $0.270 |

**Observation:** Infrastructure is negligible (<3% of total cost). STT dominates.

---

## 5. Cost Optimization Levers

### Immediate (0-30 days)

| Optimization | Savings | Effort |
|--------------|---------|--------|
| Deepgram enterprise pricing | 16% | Low |
| Aggressive pre-gen caching | 10-20% LLM | Low |
| Silence detection (skip STT) | 5-10% | Medium |

### Medium-term (30-90 days)

| Optimization | Savings | Effort |
|--------------|---------|--------|
| Self-hosted Whisper | 40-60% STT | High |
| Fine-tuned smaller LLM | 30% LLM | High |
| Regional STT routing | 10% | Medium |

### Long-term (90+ days)

| Optimization | Savings | Effort |
|--------------|---------|--------|
| Custom STT model | 50-70% STT | Very High |
| On-device processing | Variable | Very High |
| Hybrid cloud/edge | 20-30% | High |

---

## 6. Scenario Modeling

### Scenario A: Bootstrap (1,000 users)

```
Monthly Revenue: 1,000 × $15 (blended) = $15,000
Monthly Cost:
  - Deepgram: 10,000 sessions × $0.16 = $1,600
  - OpenAI: 10,000 sessions × $0.005 = $50
  - Infra: 3 instances × $77 = $231
  - Total: $1,881

Gross Profit: $13,119 (87.5%)
```

### Scenario B: Growth (10,000 users)

```
Monthly Revenue: 10,000 × $15 = $150,000
Monthly Cost:
  - Deepgram: 100,000 sessions × $0.13 = $13,000
  - OpenAI: 100,000 sessions × $0.005 = $500
  - Infra: 15 instances × $77 = $1,155
  - Support/Ops: $5,000
  - Total: $19,655

Gross Profit: $130,345 (86.9%)
```

### Scenario C: Scale (100,000 users)

```
Monthly Revenue: 100,000 × $15 = $1,500,000
Monthly Cost:
  - Deepgram: 1M sessions × $0.11 = $110,000
  - OpenAI: 1M sessions × $0.004 = $4,000
  - Infra: 120 instances × $77 = $9,240
  - Support/Ops: $30,000
  - DevOps team: $50,000
  - Total: $203,240

Gross Profit: $1,296,760 (86.5%)
```

---

## 7. Risk Factors

### Pricing Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Deepgram price increase | Low | High | Multi-provider strategy |
| OpenAI price increase | Low | Low | Small % of cost |
| AWS price increase | Very Low | Low | Multi-cloud ready |

### Usage Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Power users abuse | Medium | Medium | Fair use limits |
| Bot/fraud usage | Medium | High | Rate limiting, auth |
| Seasonal spikes | High | Medium | Auto-scaling |

### Technical Risk

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| STT accuracy regression | Low | High | Quality monitoring |
| LLM degradation | Low | Medium | Response validation |
| Latency increase | Medium | Medium | SLA monitoring |

---

## 8. Break-Even Analysis

### Monthly Break-Even

```
Fixed Costs (monthly):
  - Infrastructure (base): $500
  - Monitoring/Tools: $200
  - Domain/SSL: $20
  - Total Fixed: $720

Variable Cost per User: $1.99

Break-even users = Fixed / (Price - Variable)
At $9.99: 720 / (9.99 - 1.99) = 90 users
At $19.99: 720 / (19.99 - 1.99) = 40 users
At $29.99: 720 / (29.99 - 1.99) = 26 users
```

### Customer Acquisition Cost (CAC) Targets

| Channel | Est. CAC | Payback Period |
|---------|----------|----------------|
| Organic/SEO | $5-15 | 1 month |
| LinkedIn Ads | $30-50 | 2-3 months |
| Google Ads | $40-80 | 3-5 months |
| Referral | $10-20 | 1-2 months |

**Target CAC:** <$30 for 3-month payback at $19.99/mo

---

## 9. LTV Analysis

### User Lifetime Value

```
Assumptions:
  - Monthly churn: 8%
  - Average lifetime: 12.5 months (1/0.08)
  - Monthly revenue: $15 (blended)
  - Gross margin: 87%

LTV = Revenue × Lifetime × Margin
LTV = $15 × 12.5 × 0.87 = $163.13
```

### LTV:CAC Ratio

| CAC | LTV:CAC | Assessment |
|-----|---------|------------|
| $20 | 8.2:1 | Excellent |
| $40 | 4.1:1 | Good |
| $60 | 2.7:1 | Acceptable |
| $100 | 1.6:1 | Concerning |

**Target LTV:CAC:** >3:1

---

## 10. Financial Projections

### 12-Month Forecast

| Month | Users | Revenue | COGS | Gross Profit | GM% |
|-------|-------|---------|------|--------------|-----|
| 1 | 100 | $1,500 | $199 | $1,301 | 86.7% |
| 3 | 500 | $7,500 | $995 | $6,505 | 86.7% |
| 6 | 2,000 | $30,000 | $3,640 | $26,360 | 87.9% |
| 9 | 5,000 | $75,000 | $8,650 | $66,350 | 88.5% |
| 12 | 10,000 | $150,000 | $16,400 | $133,600 | 89.1% |

### Second Year Target

| Metric | Target |
|--------|--------|
| Users | 50,000 |
| MRR | $750,000 |
| ARR | $9,000,000 |
| Gross Margin | 90%+ |
| Net Margin | 40%+ |

---

## Conclusion

### Unit Economics Verdict: ✅ VIABLE

| Factor | Assessment |
|--------|------------|
| Variable cost/user | $1.37-$2.39 (healthy) |
| Gross margin potential | 85-90% (strong) |
| Break-even threshold | 40-90 users (achievable) |
| LTV:CAC potential | 4-8x (excellent) |
| Scale economics | Improving with volume |
| Cost optimization runway | 30-50% reduction possible |

### Key Insights

1. **STT is the cost driver** (85%+ of variable cost)
   - Deepgram negotiation is highest-leverage
   - Self-hosted Whisper is medium-term option

2. **LLM cost is negligible**
   - GPT-4o-mini is remarkably cheap
   - No need to optimize aggressively here

3. **Infrastructure doesn't matter**
   - <3% of cost even at scale
   - Focus on reliability, not cost

4. **Pricing power exists**
   - Competitors are more expensive or less capable
   - $19.99/mo leaves significant margin

5. **Path to profitability is clear**
   - 85%+ gross margins from day 1
   - Improves with scale (volume discounts)
   - Multiple optimization levers available

---

*This model should be re-validated quarterly as pricing and usage patterns evolve.*
