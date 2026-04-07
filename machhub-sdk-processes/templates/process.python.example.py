# Python Process Examples
#
# MACHHUB wraps your code in:
#   def execute(context):
#       inputs = context['inputs']
#       trigger = context['trigger']
#       # YOUR CODE HERE
#
# Copy ONE example body into your process — do not define the function
# signature yourself. Each example below is a complete standalone function
# showing what a different process body looks like.
#
# inputs               → dict of resolved input values (tag reads, SQL results,
#                         HTTP body fields for http-triggered processes)
# trigger              → dict: { 'type': '...', 'config': { ... }, 'data': { ... } }
#                         trigger['data'] is runtime-only (never persisted) and contains:
#                           tag_change: topic, payload, retain, content_type, user_properties
#                           http:       method, headers, query, body
# context              → full dict (also has: timestamp, domain_id, process_name)
#
# IMPORTANT: The new tag value is NOT injected into inputs for tag_change automatically.
#            Add a tag Input with the same tag path to read it via inputs['name'].
#            Alternatively, read trigger['data']['payload'] for the raw/decoded value.
#
# Wildcard tag inputs: A tag input with '+' or '#' in the path resolves to a dict
#   keyed by the matching concrete topic, e.g.:
#   inputs['allTemps'] = { 'sensors/room1/temperature': 25.4, 'sensors/room2/temperature': 22.1 }
#
# HTTP body handling:  For HTTP-triggered processes the request body fields are
#                      merged into inputs automatically. Access via inputs['field'].
#                      Raw request details (headers, query params) are in trigger['data'].
#
# Return value → processed by your configured Outputs (SQL writes, tag writes).

from datetime import datetime


# ---------------------------------------------------------------------------
# Example 1: Tag threshold alert
# Trigger: tag_change on "sensors/line1/temperature"
# Input:   tag input named "temperature" → reads "sensors/line1/temperature"
#          (the tag_change trigger does NOT inject the new value automatically)
# Output:  tag_write → "alerts/line1/temperature_status"
# ---------------------------------------------------------------------------
def execute_tag_threshold_alert(context):
    THRESHOLD = 80
    new_value = inputs['temperature']   # from tag Input named "temperature"

    status = 'alert' if new_value > THRESHOLD else 'normal'
    print(f"Temperature: {new_value}°C — status: {status}")

    return {
        'status': status,
        'value': new_value,
        'timestamp': datetime.utcnow().isoformat()
    }


# ---------------------------------------------------------------------------
# Example 2: Scheduled data aggregation
# Trigger: cron "0 * * * *"  (every hour)
# Input:   sql "hourlyReadings" → SELECT * FROM myapp.readings WHERE ...
# Output:  sql → INSERT INTO myapp.hourly_summary ...
# Note: 'inputs' is a local var available in the wrapper (same as context['inputs']).
# ---------------------------------------------------------------------------
def execute_scheduled_aggregation(context):
    readings = inputs.get('hourlyReadings', [])

    if not readings:
        return {'count': 0, 'average': None}

    values = [r['value'] for r in readings]
    average = sum(values) / len(values)

    print(f"Aggregated {len(readings)} readings. avg={average:.2f}")

    return {
        'count': len(readings),
        'average': round(average, 4),
        'min': min(values),
        'max': max(values),
        'timestamp': datetime.utcnow().isoformat()
    }


# ---------------------------------------------------------------------------
# Example 3: HTTP endpoint — custom OEE calculation
# Trigger: http "calculate-oee"  →  POST /process/calculate-oee
# Input:   sql "shiftData"
#          HTTP body fields are merged into inputs automatically.
#          e.g. POST body { "line": "A", "shift": "morning" } → inputs['line'], inputs['shift']
# Output:  none (result returned directly as HTTP response)
# ---------------------------------------------------------------------------
def execute_http_oee(context):
    line = inputs.get('line')          # from HTTP request body
    shift = inputs.get('shift')        # from HTTP request body
    shift_data = inputs.get('shiftData', [])

    if not shift_data:
        return {'error': 'No shift data found'}

    d = shift_data[0]
    availability = d['run_time'] / d['planned_time']
    performance = (d['ideal_cycle_time'] * d['total_parts']) / d['run_time']
    quality = d['good_parts'] / d['total_parts']
    oee = availability * performance * quality

    return {
        'line': line,
        'shift': shift,
        'oee': round(oee * 100, 2),
        'availability': round(availability * 100, 2),
        'performance': round(performance * 100, 2),
        'quality': round(quality * 100, 2)
    }


# ---------------------------------------------------------------------------
# Example 4: Wildcard tag input
# Trigger: cron "*/5 * * * *"
# Input:   tag input named "allTemps" with config.tag = "sensors/+/temperature"
#          → resolves to a dict: { "sensors/room1/temperature": 25.4, ... }
# Output:  none
# ---------------------------------------------------------------------------
def execute_wildcard_tags(context):
    all_temps = inputs.get('allTemps', {})   # dict: topic → value

    if not all_temps:
        return {'count': 0, 'average': None}

    values = list(all_temps.values())
    average = sum(values) / len(values)

    print(f"Average temperature across {len(values)} sensors: {average:.2f}°C")
    return {
        'count': len(values),
        'average': round(average, 4),
        'readings': all_temps
    }


# ---------------------------------------------------------------------------
# Example 5: Accessing trigger['data'] in a tag_change process
# Trigger:  tag_change on "production/+/status"
# Input:    none
# Output:   none
# ---------------------------------------------------------------------------
def execute_tag_change_with_data(context):
    data = trigger.get('data', {})
    topic = data.get('topic', 'unknown')       # e.g. "production/line1/status"
    new_payload = data.get('payload')          # decoded JSON or raw string
    user_props = data.get('user_properties', {})

    print(f"Tag change on {topic}: {new_payload}")

    # Extract the line segment from the wildcard topic
    parts = topic.split('/')
    line = parts[1] if len(parts) > 1 else 'unknown'
    return {'line': line, 'status': new_payload, 'topic': topic}


# ---------------------------------------------------------------------------
# Example 6: Accessing trigger['data'] in an HTTP process
# Trigger:  http "process-order"  →  POST /process/process-order
# Input:    none (body fields arrive in inputs AND trigger['data']['body'])
# Output:   sql
# ---------------------------------------------------------------------------
def execute_http_with_trigger_data(context):
    order_id = inputs.get('orderId')           # from HTTP body (via inputs merge)
    query_params = trigger.get('data', {}).get('query', {})
    debug = query_params.get('debug') == 'true'

    print(f"Processing order {order_id}, debug={debug}")
    return {'orderId': order_id, 'processed': True}
