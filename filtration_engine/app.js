/**
 * Video Event Analytics Engine - Person-Centric Application Pipeline
 * 
 * Pipeline:
 * RAW JSON -> RAW RECORD EXTRACTION -> PERSON vs OBJECT CLASSIFICATION 
 * -> PERSON-CENTRIC FILTER -> EVENT NORMALIZATION & SUSPICIOUS DETECTOR
 * -> TRACK CONSOLIDATION -> VALIDATION -> ANALYTICS & SUMMARY -> 3 GRAPHS
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global Pipeline State
  let pipelineData = {
    rawRecords: [],
    classifiedRecords: [],
    personRecords: [],
    objectRecords: [],
    validPersonEvents: [],
    suspiciousEvents: [],
    metrics: {}
  };

  // Chart Instances
  let timelineChartInstance = null;
  let distributionChartInstance = null;
  let durationChartInstance = null;

  // Chart.js Theme Defaults
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
  Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';
  Chart.defaults.plugins.tooltip.titleColor = '#f8fafc';
  Chart.defaults.plugins.tooltip.bodyColor = '#cbd5e1';
  Chart.defaults.plugins.tooltip.borderColor = '#1f2937';
  Chart.defaults.plugins.tooltip.borderWidth = 1;

  // DOM Elements
  const jsonTextarea = document.getElementById('json-input');
  const fileDropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('file-input');
  const btnProcess = document.getElementById('btn-process');
  const btnCleanSample = document.getElementById('btn-clean-sample');
  const btnMessySample = document.getElementById('btn-messy-sample');
  const btnClear = document.getElementById('btn-clear');
  const jsonErrorAlert = document.getElementById('json-error-alert');

  // Filter DOM Elements
  const tableSearch = document.getElementById('table-search');
  const filterViewType = document.getElementById('filter-view-type');
  const filterEventType = document.getElementById('filter-event-type');

  // Modal Elements
  const rawModal = document.getElementById('raw-modal');
  const modalClose = document.getElementById('modal-close');
  const modalIndex = document.getElementById('modal-index');
  const modalCategory = document.getElementById('modal-category');
  const modalStatus = document.getElementById('modal-status');
  const modalSuspicious = document.getElementById('modal-suspicious');
  const modalReason = document.getElementById('modal-reason');
  const modalJsonCode = document.getElementById('modal-json-code');

  // =========================================================================
  // 1. DATA INGESTION & EVENT LISTENERS
  // =========================================================================

  btnCleanSample.addEventListener('click', () => {
    if (typeof cleanSampleJSON !== 'undefined') {
      jsonTextarea.value = cleanSampleJSON;
      runPipeline(cleanSampleJSON);
    }
  });

  btnMessySample.addEventListener('click', () => {
    if (typeof messySampleJSON !== 'undefined') {
      jsonTextarea.value = messySampleJSON;
      runPipeline(messySampleJSON);
    }
  });

  btnClear.addEventListener('click', () => {
    jsonTextarea.value = '';
    hideError();
    resetDashboard();
  });

  btnProcess.addEventListener('click', () => {
    const text = jsonTextarea.value.trim();
    if (!text) {
      showError('Please paste raw JSON or upload a file first.');
      return;
    }
    runPipeline(text);
  });

  // File Upload Handlers
  fileDropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  fileDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropzone.classList.add('drag-over');
  });

  fileDropzone.addEventListener('dragleave', () => {
    fileDropzone.classList.remove('drag-over');
  });

  fileDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showError('Invalid file type. Please upload a .json file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      jsonTextarea.value = content;
      runPipeline(content);
    };
    reader.onerror = () => showError('Failed to read file.');
    reader.readAsText(file);
  }

  // Modal Handlers
  modalClose.addEventListener('click', closeModal);
  window.addEventListener('click', (e) => {
    if (e.target === rawModal) closeModal();
  });

  function openModal(record) {
    modalIndex.textContent = `Source Record #${record.sourceIndex}`;
    
    modalCategory.textContent = (record.category || 'record').toUpperCase();
    modalCategory.className = `status-badge ${record.category === 'object' ? 'warning' : 'valid'}`;

    modalStatus.textContent = (record.status || 'valid').toUpperCase();
    modalStatus.className = `status-badge ${record.status}`;

    const isSusp = record.suspicious ? 'YES' : 'NO';
    modalSuspicious.textContent = isSusp;
    modalSuspicious.className = `status-badge ${record.suspicious ? 'invalid' : 'valid'}`;

    modalReason.textContent = record.validationReason || 'Valid record';
    modalJsonCode.textContent = JSON.stringify(record.rawRecord, null, 2);
    rawModal.style.display = 'flex';
  }

  function closeModal() {
    rawModal.style.display = 'none';
  }

  function showError(msg) {
    jsonErrorAlert.textContent = msg;
    jsonErrorAlert.style.display = 'block';
  }

  function hideError() {
    jsonErrorAlert.style.display = 'none';
  }

  // =========================================================================
  // 2. PERSON-CENTRIC PIPELINE ENGINE
  // =========================================================================

  function runPipeline(rawInputString) {
    hideError();

    // Step 1: Parse Raw JSON safely
    const parsed = parseRawJSON(rawInputString);
    if (!parsed.success) {
      showError(`JSON Parse Error: ${parsed.error}`);
      resetDashboard();
      return;
    }

    // Step 2: Extract candidate records while preserving original JSON structures
    const candidateItems = extractCandidateRecords(parsed.data);
    if (!candidateItems || candidateItems.length === 0) {
      showError('No records found in JSON.');
      resetDashboard();
      return;
    }

    // Step 3: Classify each record as Person vs Object
    const classifiedRecords = candidateItems.map((item, idx) => {
      const category = classifyRecord(item);
      const timestamps = extractRecordTimestamps(item.rec);
      const eventNorm = normalizePersonEvent(item.rec);
      const confidence = extractConfidence(item.rec);
      const trackId = extractTrackId(item.rec);
      const suspicious = classifySuspicious(item.rec, eventNorm.eventType);

      let status = 'valid';
      let reason = 'Passed validation';

      if (!timestamps.main.isValid) {
        status = 'invalid';
        reason = 'Missing or unparseable timestamp';
      } else if (!eventNorm.isValid && category === 'person') {
        status = 'invalid';
        reason = 'Missing event/label';
      } else if (confidence !== null && confidence < 0.4) {
        status = 'warning';
        reason = 'Low confidence score (< 40%)';
      }

      return {
        id: `rec_${idx + 1}`,
        sourceIndex: idx + 1,
        category: category, // 'person' or 'object'
        path: item.path,
        personId: trackId,
        timestampSec: timestamps.main.seconds,
        timestampFormatted: timestamps.main.formatted,
        endTimeSec: timestamps.end.seconds,
        endTimeFormatted: timestamps.end.formatted,
        rawTimestamp: timestamps.main.raw,
        eventDisplay: eventNorm.display,
        eventType: eventNorm.eventType,
        rawEvent: eventNorm.raw,
        confidence: confidence,
        status: status,
        suspicious: suspicious,
        validationReason: reason,
        rawRecord: item.rec
      };
    });

    // Step 4: Separate Person Records vs Ignored Object Records
    const personRecords = classifiedRecords.filter(r => r.category === 'person');
    const objectRecords = classifiedRecords.filter(r => r.category === 'object');

    // Step 5: Consolidate frame-level repeated detections per Track ID / Timestamp proximity
    const consolidatedPersonEvents = consolidateFrameDetections(personRecords);

    // Filter valid person events for primary analytics
    const validPersonEvents = sortChronologically(
      consolidatedPersonEvents.filter(r => r.status !== 'invalid')
    );

    const suspiciousEvents = validPersonEvents.filter(r => r.suspicious);

    // Compute Metrics
    const rawCount = classifiedRecords.length;
    const personCount = personRecords.length;
    const objectCount = objectRecords.length;
    const validPersonCount = validPersonEvents.length;
    const warningCount = personRecords.filter(r => r.status === 'warning').length;
    const invalidPersonCount = personRecords.filter(r => r.status === 'invalid').length;
    const suspiciousCount = suspiciousEvents.length;

    const uniqueTypesSet = new Set(validPersonEvents.map(e => e.eventType));

    pipelineData = {
      rawRecords: classifiedRecords,
      classifiedRecords,
      personRecords,
      objectRecords,
      validPersonEvents,
      suspiciousEvents,
      metrics: {
        rawCount,
        personCount,
        objectCount,
        validPersonCount,
        warningCount,
        invalidPersonCount,
        suspiciousCount,
        uniqueTypesCount: uniqueTypesSet.size,
        uniqueTypesList: Array.from(uniqueTypesSet)
      }
    };

    // Render Dashboard
    renderQualitySummary(pipelineData.metrics);
    populateEventTypeFilter(pipelineData.metrics.uniqueTypesList);
    renderDataTable();
    renderCharts(validPersonEvents);
  }

  // -------------------------------------------------------------------------
  // Helper: Parse Raw JSON
  // -------------------------------------------------------------------------
  function parseRawJSON(str) {
    try {
      const data = JSON.parse(str);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // -------------------------------------------------------------------------
  // Helper: Extract Candidate Records while preserving paths
  // -------------------------------------------------------------------------
  function extractCandidateRecords(data) {
    if (data && data.data && Array.isArray(data.data.events)) {
      return data.data.events.map((rec, idx) => ({ rec, path: `data.events[${idx}]` }));
    }
    if (data && Array.isArray(data.events)) {
      return data.events.map((rec, idx) => ({ rec, path: `events[${idx}]` }));
    }
    if (Array.isArray(data)) {
      return data.map((rec, idx) => ({ rec, path: `[${idx}]` }));
    }
    if (typeof data !== 'object' || data === null) return [];

    let candidates = [];
    const keysToCheck = ['people', 'persons', 'detections', 'objects', 'tracks', 'results', 'items', 'records'];
    let foundKey = false;

    for (const key of keysToCheck) {
      if (Array.isArray(data[key])) {
        foundKey = true;
        data[key].forEach((item, idx) => {
          candidates.push({ rec: item, path: `${key}[${idx}]` });
        });
      }
    }

    if (foundKey && candidates.length > 0) return candidates;

    // Search object recursively for array properties
    for (const key in data) {
      if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object') {
        data[key].forEach((item, idx) => {
          candidates.push({ rec: item, path: `${key}[${idx}]` });
        });
      }
    }

    if (candidates.length > 0) return candidates;
    return [{ rec: data, path: 'root' }];
  }

  // -------------------------------------------------------------------------
  // Helper: Classify Record (Person vs Object)
  // -------------------------------------------------------------------------
  function classifyRecord(item) {
    const rec = item.rec;
    const path = item.path || '';

    if (rec.person !== undefined) return 'person';

    if (path.startsWith('people') || path.startsWith('persons')) return 'person';
    if (path.startsWith('objects')) return 'object';

    const textToScan = [
      rec.person, rec.class, rec.label, rec.object_type, rec.category, rec.entity,
      rec.description, rec.event, rec.activity, rec.event_type, rec.action,
      rec.type, rec.name
    ].filter(Boolean).map(s => String(s).toLowerCase()).join(' ');

    const personKeywords = ['person', 'human', 'pedestrian', 'man', 'woman', 'child', 'subject'];
    const objectKeywords = ['bag', 'backpack', 'chair', 'table', 'box', 'bottle', 'phone', 'laptop', 'vehicle', 'car', 'truck', 'bus', 'stationary', 'object'];

    const isPersonMatch = personKeywords.some(k => textToScan.includes(k));
    const isObjectMatch = objectKeywords.some(k => textToScan.includes(k));

    if (isPersonMatch && !isObjectMatch) return 'person';
    if (isObjectMatch && !isPersonMatch) return 'object';

    if (rec.person_id !== undefined || rec.track_id !== undefined || rec.tracking_id !== undefined) {
      if (!isObjectMatch) return 'person';
    }

    if (/enter|exit|leave|left|moving|stopped|walking|running|loitering|restricted/i.test(textToScan)) {
      return 'person';
    }

    if (isObjectMatch) return 'object';
    return 'person';
  }

  // -------------------------------------------------------------------------
  // Helper: Extract Track ID / Person ID
  // -------------------------------------------------------------------------
  function extractTrackId(rec) {
    if (rec.person !== undefined && rec.person !== null) {
      const match = String(rec.person).match(/\d+/);
      if (match) return parseInt(match[0], 10);
      return rec.person;
    }
    const keys = ['track_id', 'person_id', 'tracking_id', 'object_id', 'id'];
    for (const k of keys) {
      if (rec[k] !== undefined && rec[k] !== null && String(rec[k]).trim() !== '') {
        return rec[k];
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Helper: Normalize Timestamps
  // -------------------------------------------------------------------------
  function normalizeTimestamp(value) {
    if (value === undefined || value === null || value === '') {
      return { seconds: null, formatted: 'Missing', isValid: false };
    }
    if (typeof value === 'number') {
      if (isNaN(value) || value < 0) return { seconds: null, formatted: 'Invalid', isValid: false };
      return { seconds: value, formatted: secondsToTimestamp(value), isValid: true };
    }
    if (typeof value === 'string') {
      let str = value.trim().toLowerCase();
      if (str.endsWith('s')) str = str.slice(0, -1);
      if (str.includes(':')) {
        const parts = str.split(':').map(Number);
        if (parts.some(isNaN)) return { seconds: null, formatted: 'Invalid', isValid: false };
        let secs = 0;
        if (parts.length === 2) secs = parts[0] * 60 + parts[1];
        else if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
        return { seconds: secs, formatted: secondsToTimestamp(secs), isValid: true };
      }
      const num = parseFloat(str);
      if (!isNaN(num) && num >= 0) {
        return { seconds: num, formatted: secondsToTimestamp(num), isValid: true };
      }
    }
    return { seconds: null, formatted: 'Invalid', isValid: false };
  }

  function secondsToTimestamp(seconds) {
    if (seconds === null || isNaN(seconds)) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    const paddedMins = String(mins).padStart(2, '0');
    const paddedSecs = parseFloat(secs) < 10 ? `0${secs}` : secs;
    return `${paddedMins}:${paddedSecs}`;
  }

  function extractRecordTimestamps(record) {
    let mainTsRaw = null;
    if (record.timestamp && record.timestamp.seconds !== undefined) {
      mainTsRaw = record.timestamp.seconds;
    } else {
      const candidateKeys = ['timestamp', 'time', 'time_sec', 'seconds', 'elapsed_time', 't', 'start_time', 'startTime', 'startTimestamp', 'frame_time'];
      for (const key of candidateKeys) {
        if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
          mainTsRaw = record[key];
          break;
        }
      }
    }
    const normMain = normalizeTimestamp(mainTsRaw);

    let endTsRaw = null;
    if (record.end_timestamp && record.end_timestamp.seconds !== undefined) {
      endTsRaw = record.end_timestamp.seconds;
    } else {
      const endKeys = ['end_time', 'endTime', 'endTimestamp'];
      for (const key of endKeys) {
        if (record[key] !== undefined && record[key] !== null) {
          endTsRaw = record[key];
          break;
        }
      }
    }
    const normEnd = endTsRaw !== null ? normalizeTimestamp(endTsRaw) : { seconds: null, isValid: false };

    return { main: normMain, end: normEnd };
  }

  // -------------------------------------------------------------------------
  // Helper: Normalize Person Event & Activity
  // -------------------------------------------------------------------------
  function normalizePersonEvent(record) {
    const candidateKeys = ['event', 'label', 'action', 'activity', 'description', 'class', 'event_type', 'eventType', 'type', 'name'];
    let rawValue = null;
    for (const key of candidateKeys) {
      if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
        rawValue = String(record[key]).trim();
        break;
      }
    }

    if (!rawValue) {
      return { display: 'Person Activity', eventType: 'PERSON_ACTIVITY', raw: '', isValid: false };
    }

    const lower = rawValue.toLowerCase();

    // Enter / Exit Logic
    if (/enter|entry|entered|person_enter/i.test(lower)) {
      return { display: 'Person Entered', eventType: 'PERSON_ENTER', raw: rawValue, isValid: true };
    }
    if (/exit|exited|leave|left|person_exit/i.test(lower)) {
      return { display: 'Person Exited', eventType: 'PERSON_EXIT', raw: rawValue, isValid: true };
    }

    // Movement Logic
    if (/stopped|standing|person_stopped/i.test(lower)) {
      return { display: 'Person Stopped', eventType: 'PERSON_STOPPED', raw: rawValue, isValid: true };
    }
    if (/moving|walking|running|motion|person_moving/i.test(lower)) {
      return { display: 'Person Moving', eventType: 'PERSON_MOVING', raw: rawValue, isValid: true };
    }

    // Suspicious / Restricted Logic
    if (/restricted|unauthorized|suspicious|loitering|abnormal|unusual/i.test(lower)) {
      return { display: 'Person Suspicious Activity', eventType: 'PERSON_SUSPICIOUS', raw: rawValue, isValid: true };
    }

    // Default Person Label Formatting
    const slug = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const display = slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { display, eventType: slug.toUpperCase(), raw: rawValue, isValid: true };
  }

  // -------------------------------------------------------------------------
  // Helper: Extract Confidence
  // -------------------------------------------------------------------------
  function extractConfidence(record) {
    if (record.confidence !== undefined && record.confidence !== null) {
      const val = record.confidence;
      if (typeof val === 'number') return val > 1 && val <= 100 ? val / 100 : val;
    }
    const candidateKeys = ['confidence', 'score', 'prob', 'probability'];
    for (const key of candidateKeys) {
      const val = record[key];
      if (val !== undefined && val !== null) {
        if (typeof val === 'number') return val > 1 && val <= 100 ? val / 100 : val;
        if (typeof val === 'string') {
          let str = val.trim();
          if (str.endsWith('%')) {
            const num = parseFloat(str.slice(0, -1));
            return isNaN(num) ? null : num / 100;
          }
          const num = parseFloat(str);
          if (!isNaN(num)) return num > 1 && num <= 100 ? num / 100 : num;
        }
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Helper: Classify Suspicious Events
  // -------------------------------------------------------------------------
  function classifySuspicious(record, eventType) {
    if (record.suspicious === true || record.is_suspicious === true) return true;
    const textToScan = [
      record.event, record.label, record.action, record.activity,
      record.description, record.zone, record.location, eventType
    ].filter(Boolean).map(s => String(s).toLowerCase()).join(' ');

    return /restricted|unauthorized|suspicious|loitering|abnormal|unusual/i.test(textToScan);
  }

  // -------------------------------------------------------------------------
  // Helper: Frame-Level Duplicate & Track Consolidation
  // -------------------------------------------------------------------------
  function consolidateFrameDetections(personRecords) {
    if (!personRecords || personRecords.length === 0) return [];

    const sorted = [...personRecords].sort((a, b) => (a.timestampSec || 0) - (b.timestampSec || 0));
    const consolidated = [];

    sorted.forEach(rec => {
      if (rec.status === 'invalid' || !rec.personId) {
        consolidated.push(rec);
        return;
      }

      // If duration_seconds is provided directly, just use it
      if (rec.rawRecord && rec.rawRecord.duration_seconds) {
        if (!rec.endTimeSec) {
          rec.endTimeSec = rec.timestampSec + rec.rawRecord.duration_seconds;
          rec.endTimeFormatted = secondsToTimestamp(rec.endTimeSec);
        }
        consolidated.push(rec);
        return;
      }

      // Otherwise try to consolidate consecutive similar events
      const lastMatchIndex = consolidated.findLastIndex(prev => 
        prev.personId === rec.personId &&
        prev.eventType === rec.eventType &&
        prev.status !== 'invalid' &&
        Math.abs(rec.timestampSec - (prev.endTimeSec || prev.timestampSec)) <= 2.0
      );

      if (lastMatchIndex !== -1 && !consolidated[lastMatchIndex].rawRecord.duration_seconds) {
        // Consolidate into interval event
        const match = consolidated[lastMatchIndex];
        match.endTimeSec = rec.timestampSec;
        match.endTimeFormatted = rec.timestampFormatted;
        match.validationReason = `Consolidated tracking interval for Track #${rec.personId}`;
      } else {
        consolidated.push({ ...rec });
      }
    });

    return consolidated;
  }

  function sortChronologically(records) {
    return [...records].sort((a, b) => (a.timestampSec || 0) - (b.timestampSec || 0));
  }

  // =========================================================================
  // 3. UI RENDERING & AUDIT TABLE
  // =========================================================================

  function renderQualitySummary(metrics) {
    document.getElementById('metric-raw-records').textContent = metrics.rawCount;
    document.getElementById('metric-person-records').textContent = metrics.personCount;
    document.getElementById('metric-ignored-objects').textContent = metrics.objectCount;
    document.getElementById('metric-valid-person-events').textContent = metrics.validPersonCount;
    document.getElementById('metric-warning-records').textContent = metrics.warningCount;
    document.getElementById('metric-invalid-records').textContent = metrics.invalidPersonCount;
    document.getElementById('metric-unique-types').textContent = metrics.uniqueTypesCount;
    document.getElementById('metric-suspicious-events').textContent = metrics.suspiciousCount;
  }

  function populateEventTypeFilter(uniqueTypesList) {
    filterEventType.innerHTML = '<option value="all">All Person Event Types</option>';
    uniqueTypesList.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      filterEventType.appendChild(option);
    });
  }

  tableSearch.addEventListener('input', renderDataTable);
  filterViewType.addEventListener('change', renderDataTable);
  filterEventType.addEventListener('change', renderDataTable);

  function renderDataTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    const searchTerm = tableSearch.value.toLowerCase().trim();
    const viewVal = filterViewType.value;
    const typeVal = filterEventType.value;

    let sourceDataset = [];
    if (viewVal === 'person') {
      sourceDataset = pipelineData.validPersonEvents;
    } else if (viewVal === 'suspicious') {
      sourceDataset = pipelineData.suspiciousEvents;
    } else if (viewVal === 'objects') {
      sourceDataset = pipelineData.objectRecords;
    } else {
      sourceDataset = pipelineData.classifiedRecords; // All Raw Records
    }

    const filtered = sourceDataset.filter(rec => {
      if (typeVal !== 'all' && rec.eventType !== typeVal) return false;

      if (searchTerm) {
        const matchesEvent = rec.eventDisplay.toLowerCase().includes(searchTerm);
        const matchesType = (rec.eventType || '').toLowerCase().includes(searchTerm);
        const matchesTs = (rec.timestampFormatted || '').toLowerCase().includes(searchTerm);
        const matchesTrack = String(rec.personId || '').toLowerCase().includes(searchTerm);
        const matchesRaw = JSON.stringify(rec.rawRecord).toLowerCase().includes(searchTerm);
        if (!matchesEvent && !matchesType && !matchesTs && !matchesTrack && !matchesRaw) return false;
      }

      return true;
    });

    document.getElementById('table-record-count').textContent = `Showing ${filtered.length} of ${sourceDataset.length} records`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No records matching the selected filter view.</td></tr>`;
      return;
    }

    filtered.forEach(rec => {
      const tr = document.createElement('tr');
      const confText = rec.confidence !== null ? `${Math.round(rec.confidence * 100)}%` : 'N/A';
      const trackText = rec.personId !== null ? `Track #${rec.personId}` : 'N/A';
      const suspBadge = rec.suspicious 
        ? `<span class="status-badge invalid">YES</span>` 
        : `<span class="status-badge valid">NO</span>`;

      tr.innerHTML = `
        <td><span class="mono">${rec.timestampFormatted}</span></td>
        <td><span class="code-badge">${trackText}</span></td>
        <td><strong>${rec.eventDisplay}</strong></td>
        <td><span class="code-badge">${rec.eventType}</span></td>
        <td>${confText}</td>
        <td><span class="status-badge ${rec.status}">${rec.status}</span></td>
        <td>${suspBadge}</td>
        <td>
          <button class="btn-inspect" data-id="${rec.id}">Inspect Raw</button>
        </td>
      `;

      tr.querySelector('.btn-inspect').addEventListener('click', () => openModal(rec));
      tbody.appendChild(tr);
    });
  }

  function resetDashboard() {
    pipelineData = {
      rawRecords: [],
      classifiedRecords: [],
      personRecords: [],
      objectRecords: [],
      validPersonEvents: [],
      suspiciousEvents: [],
      metrics: {}
    };

    renderQualitySummary({
      rawCount: 0,
      personCount: 0,
      objectCount: 0,
      validPersonCount: 0,
      warningCount: 0,
      invalidPersonCount: 0,
      uniqueTypesCount: 0,
      suspiciousCount: 0
    });

    document.getElementById('table-body').innerHTML = `<tr><td colspan="8" class="table-empty">No JSON data loaded. Upload or paste raw JSON above.</td></tr>`;
    document.getElementById('table-record-count').textContent = '0 records';

    destroyCharts();
  }

  function destroyCharts() {
    // Clear DOM for Analysis section
    document.getElementById('analysis-table-body').innerHTML = `<tr><td colspan="7" class="table-empty">No events selected</td></tr>`;
  }

  // =========================================================================
  // 4. PERSON ACTIVITY ANALYSIS
  // =========================================================================

  let currentAnalysisEvents = [];
  let maxVideoDuration = 0;

  const personSelector = document.getElementById('person-selector');
  const timeStart = document.getElementById('time-start');
  const timeEnd = document.getElementById('time-end');
  
  personSelector.addEventListener('change', updateAnalysisView);
  timeStart.addEventListener('input', updateAnalysisView);
  timeEnd.addEventListener('input', updateAnalysisView);
  
  document.getElementById('event-detail-close').addEventListener('click', () => {
    document.getElementById('event-detail-modal').style.display = 'none';
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    const detailModal = document.getElementById('event-detail-modal');
    if (e.target === detailModal) {
      detailModal.style.display = 'none';
    }
  });

  function renderCharts(personEvents) {
    destroyCharts();
    if (!personEvents || personEvents.length === 0) return;

    currentAnalysisEvents = personEvents;

    // Determine Max Duration
    let maxTs = Math.max(...personEvents.map(e => e.endTimeSec !== null ? e.endTimeSec : (e.timestampSec || 0)));
    maxVideoDuration = Math.ceil(maxTs + 5);

    timeStart.value = 0;
    timeEnd.value = maxVideoDuration;
    
    // Populate Person Selector dynamically
    const persons = new Set(personEvents.map(e => {
      if (e.rawRecord && e.rawRecord.person) return e.rawRecord.person;
      return e.personId !== null ? `Person ${e.personId}` : null;
    }).filter(Boolean));
    
    personSelector.innerHTML = '<option value="all">All Persons ▼</option>';
    Array.from(persons).sort().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      personSelector.appendChild(opt);
    });

    updateAnalysisView();
  }

  function updateAnalysisView() {
    const selectedPerson = personSelector.value;
    const startSec = parseFloat(timeStart.value) || 0;
    const endSec = parseFloat(timeEnd.value) || maxVideoDuration;

    // Filter events based on selections
    const filtered = currentAnalysisEvents.filter(e => {
      const pName = (e.rawRecord && e.rawRecord.person) ? e.rawRecord.person : (e.personId !== null ? `Person ${e.personId}` : '');
      if (selectedPerson !== 'all' && pName !== selectedPerson) return false;
      
      const eStart = e.timestampSec || 0;
      
      // Strict range matching: event start time must fall inside selected window
      if (eStart < startSec || eStart > endSec) return false;
      
      return true;
    });

    renderAnalysisTable(filtered);
  }

  function renderAnalysisTable(events) {
    const tbody = document.getElementById('analysis-table-body');
    tbody.innerHTML = '';
    
    if (events.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No matching events in this time range</td></tr>`;
      return;
    }
    
    events.forEach(e => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      
      const pName = (e.rawRecord && e.rawRecord.person) ? e.rawRecord.person : `Person ${e.personId}`;
      const confText = e.confidence !== null ? `${Math.round(e.confidence * 100)}%` : 'N/A';
      const trackText = e.personId !== null ? e.personId : 'N/A';
      
      let durationText = '—';
      if (e.endTimeSec !== null && e.endTimeSec > (e.timestampSec || 0)) {
        durationText = `${(e.endTimeSec - e.timestampSec).toFixed(2)}s`;
      } else if (e.rawRecord && e.rawRecord.duration_seconds) {
        durationText = `${e.rawRecord.duration_seconds}s`;
      }
      
      const descText = (e.rawRecord && e.rawRecord.description) ? e.rawRecord.description : '—';
      
      tr.innerHTML = `
        <td><span class="mono">${e.timestampFormatted}</span></td>
        <td><strong>${pName}</strong></td>
        <td><span class="code-badge">${e.rawEvent || e.eventDisplay}</span></td>
        <td>${durationText}</td>
        <td>${confText}</td>
        <td>${trackText}</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${descText}">${descText}</td>
      `;
      
      tr.addEventListener('click', () => showDetailModal(e));
      tbody.appendChild(tr);
    });
  }

  function showDetailModal(e) {
    const modal = document.getElementById('event-detail-modal');
    
    const pName = (e.rawRecord && e.rawRecord.person) ? e.rawRecord.person : `Person ${e.personId}`;
    
    document.getElementById('ed-eventid').textContent = (e.rawRecord && e.rawRecord.event_id) ? e.rawRecord.event_id : 'N/A';
    document.getElementById('ed-person').textContent = pName;
    document.getElementById('ed-trackid').textContent = e.personId || 'N/A';
    document.getElementById('ed-activity').textContent = e.rawEvent || e.eventDisplay;
    document.getElementById('ed-timestamp').textContent = (e.rawRecord && e.rawRecord.timestamp && e.rawRecord.timestamp.formatted) ? e.rawRecord.timestamp.formatted : e.timestampFormatted;
    
    let endTsFormatted = 'N/A';
    if (e.rawRecord && e.rawRecord.end_timestamp && e.rawRecord.end_timestamp.formatted) {
      endTsFormatted = e.rawRecord.end_timestamp.formatted;
    } else if (e.endTimeFormatted && e.endTimeFormatted !== e.timestampFormatted) {
      endTsFormatted = e.endTimeFormatted;
    }
    document.getElementById('ed-endtimestamp').textContent = endTsFormatted;
    
    let durationText = '—';
    if (e.endTimeSec !== null && e.endTimeSec > (e.timestampSec || 0)) {
      durationText = `${(e.endTimeSec - e.timestampSec).toFixed(2)} seconds`;
    } else if (e.rawRecord && e.rawRecord.duration_seconds) {
      durationText = `${e.rawRecord.duration_seconds} seconds`;
    }
    document.getElementById('ed-duration').textContent = durationText;
    
    document.getElementById('ed-confidence').textContent = e.confidence !== null ? `${Math.round(e.confidence * 100)}%` : 'N/A';
    document.getElementById('ed-desc').textContent = (e.rawRecord && e.rawRecord.description) ? e.rawRecord.description : 'N/A';
    
    modal.style.display = 'flex';
  }

  // Load Clean Sample by default on startup
  if (typeof cleanSampleJSON !== 'undefined') {
    jsonTextarea.value = cleanSampleJSON;
    runPipeline(cleanSampleJSON);
  }
});
