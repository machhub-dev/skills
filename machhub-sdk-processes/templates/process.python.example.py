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
# trigger              → dict: { 'type': '...', 'config': { ... } }
# context              → full dict (also has: timestamp, domain_id, process_name)
#
# IMPORTANT: The new tag value is NOT injected into trigger for tag_change.
#            Add a tag Input with the same tag path to read it via inputs['name'].
#
# HTTP body handling:  For HTTP-triggered processes the request body fields are
#                      merged into inputs automatically. Access via inputs['field'].
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
