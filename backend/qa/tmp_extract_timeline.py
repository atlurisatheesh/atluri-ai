import json, re, pathlib
p = pathlib.Path(r'd:/linkedin-ai-main/backend/qa/reports/obs_single_chain.log')
lines = p.read_text(encoding='utf-8', errors='ignore').splitlines()
rows = []
for ln in lines:
    m = re.search(r'(\{"component":.*\})', ln)
    if not m:
        continue
    try:
        obj = json.loads(m.group(1))
    except Exception:
        continue
    if obj.get('component') == 'ws_voice':
        rows.append(obj)

sid = None
for obj in rows:
    if obj.get('event') == 'connect':
        sid = obj.get('session_id')

if not sid:
    print('NO_SESSION')
    raise SystemExit(0)

print('SESSION_ID', sid)
for obj in rows:
    if obj.get('session_id') != sid:
        continue
    ev = obj.get('event')
    stage = obj.get('stage')
    msg_type = obj.get('message_type')
    extras = []
    if stage:
        extras.append(f'stage={stage}')
    if msg_type:
        extras.append(f'message_type={msg_type}')
    if ev == 'disconnect':
        extras.append(f"reason={obj.get('reason')}")
    if ev in ('turn_decision_pipeline_timing', 'llm_call_completed', 'coaching_emission_timing', 'skillgraph_update_timing'):
        extras.append(f"duration_ms={obj.get('duration_ms')}")
    if ev == 'llm_call_started':
        extras.append(f"model={obj.get('model')}")
        extras.append(f"retry_count={obj.get('retry_count')}")
    line = ev + ((" | " + ", ".join(extras)) if extras else "")
    print(line)
