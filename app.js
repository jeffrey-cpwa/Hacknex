document.addEventListener('DOMContentLoaded', () => {
  let pipelineData = {
    allRecords: [],
    analysisEvents: [],
    metrics: {}
  };

  const jsonTextarea = document.getElementById('json-input');
  const fileDropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('file-input');
  const btnProcess = document.getElementById('btn-process');
  const btnCleanSample = document.getElementById('btn-clean-sample');
  const btnMessySample = document.getElementById('btn-messy-sample');
  const btnClear = document.getElementById('btn-clear');
  const jsonErrorAlert = document.getElementById('json-error-alert');

  // Filter DOM Elements for Section 3
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

  const detailModal = document.getElementById('event-detail-modal');
  const detailClose = document.getElementById('event-detail-close');


  // Samples
  btnCleanSample.addEventListener('click', () => {
    if (typeof cleanSampleJSON !== 'undefined') {
      jsonTextarea.value = cleanSampleJSON;
      runPipeline(cleanSampleJSON, false);
    }
  });

  btnMessySample.addEventListener('click', () => {
    if (typeof messySampleJSON !== 'undefined') {
      jsonTextarea.value = messySampleJSON;
      runPipeline(messySampleJSON, false);
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
    runPipeline(text, false);
  });

  // File Upload
  fileDropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
  fileDropzone.addEventListener('dragover', (e) => { e.preventDefault(); fileDropzone.classList.add('drag-over'); });
  fileDropzone.addEventListener('dragleave', () => fileDropzone.classList.remove('drag-over'));
  fileDropzone.addEventListener('drop', (e) => {
    e.preventDefault(); fileDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  function handleFile(file) {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showError('Invalid file type. Please upload a .json file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      jsonTextarea.value = e.target.result;
      runPipeline(e.target.result, false);
    };
    reader.onerror = () => showError('Failed to read file.');
    reader.readAsText(file);
  }

  // Modals
  modalClose.addEventListener('click', () => rawModal.style.display = 'none');
  detailClose.addEventListener('click', () => detailModal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === rawModal) rawModal.style.display = 'none';
    if (e.target === detailModal) detailModal.style.display = 'none';
  });

  function openRawModal(record) {
    modalIndex.textContent = `Source Record #${record.sourceIndex}`;
    modalCategory.textContent = record.category;
    modalCategory.className = `status-badge ${record.category === 'OBJECT' ? 'warning' : 'valid'}`;
    modalStatus.textContent = record.status;
    let stClass = 'warning';
    if (record.status === 'VALID') stClass = 'valid';
    if (record.status.includes('INVALID') || record.status.includes('MISSING')) stClass = 'invalid';
    modalStatus.className = `status-badge ${stClass}`;
    modalSuspicious.textContent = record.suspicious ? 'YES' : 'NO';
    modalSuspicious.className = `status-badge ${record.suspicious ? 'invalid' : 'valid'}`;
    modalReason.textContent = record.description || 'N/A';
    modalJsonCode.textContent = JSON.stringify(record.originalEvent, null, 2);
    rawModal.style.display = 'flex';
  }

  function openDetailModal(e) {
    document.getElementById('ed-eventid').textContent = e.eventId || 'N/A';
    document.getElementById('ed-person').textContent = e.person || 'N/A';
    document.getElementById('ed-trackid').textContent = e.trackId || 'N/A';
    document.getElementById('ed-activity').textContent = e.activity || 'N/A';
    document.getElementById('ed-timestamp').textContent = e.timestampFormatted;
    document.getElementById('ed-endtimestamp').textContent = e.endTimestampFormatted;
    document.getElementById('ed-duration').textContent = e.durationSeconds !== null ? `${e.durationSeconds}s` : 'N/A';
    document.getElementById('ed-confidence').textContent = e.confidence !== null ? `${Math.round(e.confidence)}%` : 'N/A';
    document.getElementById('ed-status').textContent = e.status;
    document.getElementById('ed-desc').textContent = e.description || 'N/A';
    detailModal.style.display = 'flex';
  }

  function showError(msg) {
    jsonErrorAlert.textContent = msg;
    jsonErrorAlert.style.display = 'block';
  }
  function hideError() { jsonErrorAlert.style.display = 'none'; }

  let currentRawInput = '';

  async function runPipeline(rawInputString, isRefilter) {
    hideError();
    currentRawInput = rawInputString;

    let data;
    try {
      data = JSON.parse(rawInputString);
    } catch (err) {
      showError(`JSON Parse Error: ${err.message}`);
      if (!isRefilter) resetDashboard();
      return;
    }

    try {
      const payload = {
        data: data,
        person: 'all',
        start: 0,
        end: null,
        status: 'all'
      };

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      pipelineData.allRecords = result.all_records;
      pipelineData.analysisEvents = result.analysis_events;
      pipelineData.metrics = result.metrics;

      if (!isRefilter) {
        updateDebugPanel(result.metrics);
        updateQualitySummary(result.metrics);
        populateEventTypes(result.all_records);
        renderDataTable();
      }

    } catch (err) {
      showError(`Backend error: ${err.message}`);
      if (!isRefilter) resetDashboard();
    }
  }

  function updateDebugPanel(m) {
    document.getElementById('dbg-raw').textContent = m.raw;
    document.getElementById('dbg-person').textContent = m.person;
    document.getElementById('dbg-object').textContent = m.object;
    document.getElementById('dbg-valid').textContent = m.valid;
    document.getElementById('dbg-review').textContent = m.review;
    document.getElementById('dbg-low').textContent = m.low_conf;
    document.getElementById('dbg-invalid').textContent = m.invalid;
    document.getElementById('dbg-missing-ts').textContent = m.missing_ts;
    document.getElementById('dbg-unknown-conf').textContent = m.unknown_conf;
    document.getElementById('dbg-dups').textContent = m.duplicate;
  }

  function updateQualitySummary(m) {
    document.getElementById('metric-raw-records').textContent = m.raw;
    document.getElementById('metric-person-records').textContent = m.person;
    document.getElementById('metric-ignored-objects').textContent = m.object;
    document.getElementById('metric-valid-person-events').textContent = m.valid;
    document.getElementById('metric-warning-records').textContent = m.review;
    document.getElementById('metric-invalid-records').textContent = m.invalid;
    document.getElementById('metric-unique-types').textContent = m.low_conf; 
    // Suspicious is not explicitly returned in metrics so we just keep it simple
    document.getElementById('metric-suspicious-events').textContent = 'N/A';
  }

  function populateEventTypes(records) {
    const types = new Set();
    records.forEach(r => { if(r.activity) types.add(r.activity); });
    filterEventType.innerHTML = '<option value="all">All Person Event Types</option>';
    Array.from(types).sort().forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      filterEventType.appendChild(opt);
    });
  }

  tableSearch.addEventListener('input', renderDataTable);
  filterViewType.addEventListener('change', renderDataTable);
  filterEventType.addEventListener('change', renderDataTable);

  function renderDataTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    const term = tableSearch.value.toLowerCase().trim();
    const viewVal = filterViewType.value;
    const typeVal = filterEventType.value;

    const filtered = pipelineData.allRecords.filter(r => {
      if (viewVal === 'person' && r.category !== 'PERSON') return false;
      if (viewVal === 'suspicious' && !r.suspicious) return false;
      if (viewVal === 'objects' && r.category !== 'OBJECT') return false;
      
      if (typeVal !== 'all' && r.activity !== typeVal) return false;

      if (term) {
        const text = JSON.stringify(r).toLowerCase();
        if (!text.includes(term)) return false;
      }
      return true;
    });

    document.getElementById('table-record-count').textContent = `${filtered.length} records`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No records matching filters</td></tr>`;
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      const suspBadge = r.suspicious ? `<span class="status-badge invalid">YES</span>` : `<span class="status-badge valid">NO</span>`;
      let stClass = 'warning';
      if (r.status === 'VALID') stClass = 'valid';
      if (r.status.includes('INVALID') || r.status.includes('MISSING')) stClass = 'invalid';
      
      tr.innerHTML = `
        <td><span class="mono">${r.timestampFormatted}</span></td>
        <td><strong>${r.person || 'N/A'}</strong> / <span class="code-badge">${r.trackId || 'N/A'}</span></td>
        <td><strong>${r.activity || 'N/A'}</strong></td>
        <td><span class="code-badge">${r.category}</span></td>
        <td>${r.confidence !== null ? Math.round(r.confidence) + '%' : 'N/A'}</td>
        <td><span class="status-badge ${stClass}">${r.status}</span></td>
        <td>${suspBadge}</td>
        <td><button class="btn-inspect">Inspect Raw</button></td>
      `;
      tr.querySelector('.btn-inspect').addEventListener('click', () => openRawModal(r));
      tbody.appendChild(tr);
    });
  }



  function resetDashboard() {
    document.getElementById('table-body').innerHTML = `<tr><td colspan="8" class="table-empty">No JSON data loaded.</td></tr>`;
    document.getElementById('table-record-count').textContent = '0 records';
    pipelineData.allRecords = [];
    pipelineData.analysisEvents = [];
    pipelineData.metrics = {};
  }

  if (typeof cleanSampleJSON !== 'undefined') {
    jsonTextarea.value = cleanSampleJSON;
    runPipeline(cleanSampleJSON, false);
  }
});
