import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

def parse_val(val):
    if val is None: return None
    try:
        return float(val)
    except ValueError:
        return None

def extract_events(data):
    if isinstance(data, dict):
        if 'events' in data and isinstance(data['events'], list):
            return [{'rec': r, 'idx': i} for i, r in enumerate(data['events'])]
        elif 'data' in data and isinstance(data['data'], dict) and 'events' in data['data']:
            return [{'rec': r, 'idx': i} for i, r in enumerate(data['data']['events'])]
    elif isinstance(data, list):
        return [{'rec': r, 'idx': i} for i, r in enumerate(data)]
    return []

@app.route('/api/process', methods=['POST'])
def process_data():
    payload = request.json
    raw_data = payload.get('data')
    filter_person = payload.get('person', 'all')
    filter_start = parse_val(payload.get('start', 0)) or 0
    filter_end = parse_val(payload.get('end', None))
    filter_status = payload.get('status', 'all')
    
    if not raw_data:
        return jsonify({'error': 'No data provided'}), 400

    candidates = extract_events(raw_data)
    
    parsed_records = []
    
    max_ts = 0
    
    raw_count = len(candidates)
    person_count = 0
    object_count = 0
    valid_count = 0
    review_count = 0
    low_conf_count = 0
    invalid_count = 0
    missing_ts_count = 0
    unknown_conf_count = 0
    
    seen_ids = set()
    duplicate_count = 0
    
    for item in candidates:
        rec = item['rec']
        idx = item['idx']
        
        if not isinstance(rec, dict):
            parsed_records.append({
                'eventId': None, 'trackId': None, 'person': None, 'activity': None,
                'timestampSeconds': None, 'timestampFormatted': 'N/A', 'endTimestampSeconds': None,
                'endTimestampFormatted': 'N/A', 'durationSeconds': None, 'confidence': None,
                'description': None, 'status': 'INVALID JSON', 'sourceIndex': idx, 'originalEvent': rec,
                'category': 'UNKNOWN', 'suspicious': False
            })
            invalid_count += 1
            continue
            
        event_id = rec.get('event_id')
        track_id = rec.get('track_id')
        person = rec.get('person')
        activity = rec.get('event')
        
        # Timestamp
        ts_sec = None
        ts_fmt = 'N/A'
        ts_dict = rec.get('timestamp')
        if isinstance(ts_dict, dict):
            ts_sec = parse_val(ts_dict.get('seconds'))
            ts_fmt = ts_dict.get('formatted', 'N/A')
        elif ts_dict is not None:
            ts_sec = parse_val(ts_dict)
            ts_fmt = str(ts_dict)
            
        # End Timestamp
        end_sec = None
        end_fmt = 'N/A'
        end_dict = rec.get('end_timestamp')
        if isinstance(end_dict, dict):
            end_sec = parse_val(end_dict.get('seconds'))
            end_fmt = end_dict.get('formatted', 'N/A')
        elif end_dict is not None:
            end_sec = parse_val(end_dict)
            end_fmt = str(end_dict)
            
        # Duration
        duration = parse_val(rec.get('duration_seconds'))
        if duration is None and ts_sec is not None and end_sec is not None:
            duration = end_sec - ts_sec
            
        if ts_sec is not None:
            max_ts = max(max_ts, ts_sec)
        if end_sec is not None:
            max_ts = max(max_ts, end_sec)
            
        # Confidence
        conf_raw = parse_val(rec.get('confidence'))
        conf_pct = None
        if conf_raw is not None:
            if conf_raw <= 1.0:
                conf_pct = conf_raw * 100
            else:
                conf_pct = conf_raw
                
        # Description & Suspicious
        desc = rec.get('description')
        susp_raw = str(rec.get('suspicious', '')).lower()
        
        suspicious = False
        susp_evidences = ['suspicious', 'anomaly', 'alert', 'unauthorized', 'restricted_area', 'violation']
        if susp_raw == 'true':
            suspicious = True
        
        combined_text = f"{activity} {desc}".lower()
        if any(w in combined_text for w in susp_evidences):
            suspicious = True
            
        # Deduplication
        is_dup = False
        if event_id:
            if event_id in seen_ids:
                is_dup = True
            else:
                seen_ids.add(event_id)
        else:
            # unique key fallback
            key = f"{track_id}_{ts_sec}_{activity}_{person}"
            if key in seen_ids:
                is_dup = True
            else:
                seen_ids.add(key)
                
        if is_dup:
            duplicate_count += 1
            
        # Status calculation
        status = 'UNKNOWN'
        
        if conf_pct is None:
            status = 'UNKNOWN CONFIDENCE'
        elif conf_pct == 0:
            status = 'INVALID'
        elif conf_pct < 50:
            status = 'LOW CONFIDENCE'
        elif conf_pct < 80:
            status = 'REVIEW'
        else:
            status = 'VALID'
            
        # Overrides
        if ts_sec is None:
            status = 'INVALID TIMESTAMP'
        elif not person:
            status = 'MISSING PERSON'
        elif not activity:
            status = 'MISSING ACTIVITY'
            
        # Category classification
        category = 'UNKNOWN'
        if person:
            category = 'PERSON'
        else:
            # check if it's an object
            obj_keywords = ['bag', 'chair', 'table', 'box', 'bottle', 'backpack', 'phone', 'laptop', 'vehicle', 'car', 'object', 'unattended', 'stationary']
            v = str(activity).lower()
            if any(ok in v for ok in obj_keywords):
                category = 'OBJECT'
                
        event_obj = {
            'eventId': event_id,
            'trackId': track_id,
            'person': person,
            'activity': activity,
            'timestampSeconds': ts_sec,
            'timestampFormatted': ts_fmt,
            'endTimestampSeconds': end_sec,
            'endTimestampFormatted': end_fmt,
            'durationSeconds': duration,
            'confidence': conf_pct,
            'description': desc,
            'status': status,
            'sourceIndex': idx,
            'originalEvent': rec,
            'category': category,
            'suspicious': suspicious
        }
        
        parsed_records.append(event_obj)
        
        if category == 'PERSON':
            person_count += 1
        elif category == 'OBJECT':
            object_count += 1
            
        if ts_sec is None:
            missing_ts_count += 1
            
        if status == 'VALID': valid_count += 1
        elif status == 'REVIEW': review_count += 1
        elif status == 'LOW CONFIDENCE': low_conf_count += 1
        elif status == 'UNKNOWN CONFIDENCE': unknown_conf_count += 1
        elif 'INVALID' in status or 'MISSING' in status: invalid_count += 1
        
    if isinstance(raw_data, dict) and 'duration_seconds' in raw_data:
        max_ts = parse_val(raw_data['duration_seconds']) or max_ts
        
    persons_set = set(r['person'] for r in parsed_records if r['person'])
    persons_list = sorted(list(persons_set))
    
    # Filtering for Analytics (Section 4)
    filtered_events = []
    for r in parsed_records:
        if r['category'] != 'PERSON':
            continue
            
        # Person filter
        if filter_person != 'all' and r['person'] != filter_person:
            continue
            
        # Time filter
        ts = r['timestampSeconds'] or 0
        if filter_end is not None:
            if ts < filter_start or ts > filter_end:
                continue
        else:
            if ts < filter_start:
                continue
                
        # Status filter
        if filter_status != 'all':
            if filter_status == 'valid_review':
                if r['status'] not in ['VALID', 'REVIEW']:
                    continue
            else:
                if r['status'] != filter_status:
                    continue
                    
        filtered_events.append(r)
        
    return jsonify({
        'metrics': {
            'raw': raw_count,
            'person': person_count,
            'object': object_count,
            'valid': valid_count,
            'review': review_count,
            'low_conf': low_conf_count,
            'invalid': invalid_count,
            'unknown_conf': unknown_conf_count,
            'duplicate': duplicate_count,
            'missing_ts': missing_ts_count
        },
        'all_records': parsed_records,
        'analysis_events': filtered_events,
        'persons': persons_list,
        'max_duration': max_ts
    })

if __name__ == '__main__':
    app.run(debug=True, port=3000)
