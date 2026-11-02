/**
 * TalentMatch AI — Frontend Application Logic
 * Supports dual Recruiter & Job Seeker intelligence workflows
 */

(function () {
  'use strict';

  // State Management
  const state = {
    currentMode: null, // 'recruiter' | 'candidate' | null
    samples: {
      jds: {},
      resumes: [],
      fields: []
    },
    recruiter: {
      files: [], // Array of File objects
      useSampleNames: [], // Array of string filenames
      lastResults: null,
      activeFilter: 'all',
      searchQuery: ''
    },
    candidate: {
      selectedField: '',
      file: null,
      sampleName: null,
      lastResult: null
    }
  };

  // DOM Elements Cache
  const el = {
    // Screens
    screenWelcome: document.getElementById('screen-welcome'),
    screenRecruiter: document.getElementById('screen-recruiter'),
    screenCandidate: document.getElementById('screen-candidate'),
    screenRecruiterResults: document.getElementById('screen-recruiter-results'),
    screenCandidateResults: document.getElementById('screen-candidate-results'),

    // Nav
    brandHome: document.getElementById('brand-home'),
    switchRoleBtn: document.getElementById('switch-role-btn'),
    currentRolePill: document.getElementById('current-role-pill'),
    rolePillText: document.getElementById('role-pill-text'),
    helpBtn: document.getElementById('help-btn'),

    // Welcome Screen triggers
    chooseRecruiterCard: document.getElementById('choose-recruiter-card'),
    chooseCandidateCard: document.getElementById('choose-candidate-card'),

    // Recruiter Form
    recruiterForm: document.getElementById('recruiter-form'),
    recruiterBackBtn: document.getElementById('recruiter-back-btn'),
    recruiterJdInput: document.getElementById('recruiter-jd-input'),
    recruiterCharCount: document.getElementById('recruiter-char-count'),
    recruiterSamplesBar: document.getElementById('recruiter-samples-bar'),
    recruiterDropzone: document.getElementById('recruiter-dropzone'),
    recruiterFileInput: document.getElementById('recruiter-file-input'),
    recruiterBrowseBtn: document.getElementById('recruiter-browse-btn'),
    loadSampleResumesBtn: document.getElementById('load-sample-resumes-btn'),
    recruiterFileCount: document.getElementById('recruiter-file-count'),
    recruiterFileItems: document.getElementById('recruiter-file-items'),
    recruiterClearFiles: document.getElementById('recruiter-clear-files'),
    recruiterSubmitBtn: document.getElementById('recruiter-submit-btn'),

    // Candidate Form
    candidateForm: document.getElementById('candidate-form'),
    candidateBackBtn: document.getElementById('candidate-back-btn'),
    careerFieldsGrid: document.getElementById('career-fields-grid'),
    selectedCareerField: document.getElementById('selected-career-field'),
    customFieldInput: document.getElementById('custom-field-input'),
    applyCustomFieldBtn: document.getElementById('apply-custom-field-btn'),
    candidateDropzone: document.getElementById('candidate-dropzone'),
    candidateFileInput: document.getElementById('candidate-file-input'),
    candidateBrowseBtn: document.getElementById('candidate-browse-btn'),
    candidateSampleChips: document.getElementById('candidate-sample-chips'),
    candidateFilePreview: document.getElementById('candidate-file-preview'),
    candidateFileName: document.getElementById('candidate-file-name'),
    candidateFileSize: document.getElementById('candidate-file-size'),
    candidateRemoveFile: document.getElementById('candidate-remove-file'),
    candidateSubmitBtn: document.getElementById('candidate-submit-btn'),

    // Recruiter Results
    recruiterResultsBackBtn: document.getElementById('recruiter-results-back-btn'),
    recruiterResultsRoleTitle: document.getElementById('recruiter-results-role-title'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    printRecruiterBtn: document.getElementById('print-recruiter-btn'),
    metricTotalCandidates: document.getElementById('metric-total-candidates'),
    metricTopScore: document.getElementById('metric-top-score'),
    metricAvgScore: document.getElementById('metric-avg-score'),
    metricQualifiedCount: document.getElementById('metric-qualified-count'),
    recruiterScoreFilters: document.getElementById('recruiter-score-filters'),
    recruiterCandidateSearch: document.getElementById('recruiter-candidate-search'),
    recruiterResultsContainer: document.getElementById('recruiter-results-container'),
    filterCountAll: document.getElementById('filter-count-all'),
    filterCountHigh: document.getElementById('filter-count-high'),
    filterCountMid: document.getElementById('filter-count-mid'),
    filterCountLow: document.getElementById('filter-count-low'),

    // Candidate Results
    candidateResultsBackBtn: document.getElementById('candidate-results-back-btn'),
    candidateReportName: document.getElementById('candidate-report-name'),
    candidateGaugeBar: document.getElementById('candidate-gauge-bar'),
    candidateScoreNum: document.getElementById('candidate-score-num'),
    candidateTierBadge: document.getElementById('candidate-tier-badge'),
    candidateTargetRole: document.getElementById('candidate-target-role'),
    candidateEmailTag: document.getElementById('candidate-email-tag'),
    candidateVerdictQuote: document.getElementById('candidate-verdict-quote'),
    candidateExpBadge: document.getElementById('candidate-exp-badge'),
    candidateExpFit: document.getElementById('candidate-exp-fit'),
    candidateMatchedSkills: document.getElementById('candidate-matched-skills'),
    candidateMissingSkills: document.getElementById('candidate-missing-skills'),
    candidateHighlightsList: document.getElementById('candidate-highlights-list'),
    candidateRetryBtn: document.getElementById('candidate-retry-btn'),
    candidateSwitchFieldBtn: document.getElementById('candidate-switch-field-btn'),
    printCandidateBtn: document.getElementById('print-candidate-btn'),

    // Modals
    candidateDetailModal: document.getElementById('candidate-detail-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalDismissBtn: document.getElementById('modal-dismiss-btn'),
    modalAvatar: document.getElementById('modal-avatar'),
    modalName: document.getElementById('modal-name'),
    modalSub: document.getElementById('modal-sub'),
    modalBodyContent: document.getElementById('modal-body-content'),

    guideModal: document.getElementById('guide-modal'),
    guideCloseBtn: document.getElementById('guide-close-btn'),
    guideDismissBtn: document.getElementById('guide-dismiss-btn'),

    // Loading & Toast
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingStatusMsg: document.getElementById('loading-status-msg'),
    loadingTimerText: document.getElementById('loading-timer-text'),
    toastContainer: document.getElementById('toast-container')
  };

  // Helper: Format Bytes
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Helper: Toast Notifications
  function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'error' ? '⚠️' : '✅';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Navigation & View Controller
  function showScreen(screenEl) {
    const allScreens = [
      el.screenWelcome,
      el.screenRecruiter,
      el.screenCandidate,
      el.screenRecruiterResults,
      el.screenCandidateResults
    ];

    allScreens.forEach(s => {
      s.classList.add('hidden');
      s.classList.remove('view-active');
    });

    screenEl.classList.remove('hidden');
    // Trigger transition
    requestAnimationFrame(() => {
      screenEl.classList.add('view-active');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateNavRolePill();
  }

  function updateNavRolePill() {
    if (!state.currentMode) {
      el.currentRolePill.classList.add('hidden');
    } else {
      el.currentRolePill.classList.remove('hidden');
      if (state.currentMode === 'recruiter') {
        el.rolePillText.textContent = 'Recruiter Portal';
        el.rolePillText.style.color = 'var(--indigo-light)';
      } else {
        el.rolePillText.textContent = 'Candidate Portal';
        el.rolePillText.style.color = 'var(--emerald-light)';
      }
    }
  }

  function setMode(mode) {
    state.currentMode = mode;
    if (mode === 'recruiter') {
      showScreen(el.screenRecruiter);
    } else if (mode === 'candidate') {
      showScreen(el.screenCandidate);
    } else {
      showScreen(el.screenWelcome);
    }
  }

  // Fetch initial sample data from backend
  async function fetchSamples() {
    try {
      const res = await fetch('/api/samples');
      if (res.ok) {
        const data = await res.json();
        state.samples.jds = data.sample_jds || {};
        state.samples.resumes = data.sample_resumes || [];
        state.samples.fields = data.fields || [];
        renderSampleChips();
      }
    } catch (err) {
      console.warn('Could not fetch sample presets:', err);
    }
  }

  function renderSampleChips() {
    // Render Candidate Sample chips
    if (el.candidateSampleChips && state.samples.resumes.length > 0) {
      el.candidateSampleChips.innerHTML = '';
      state.samples.resumes.forEach(sample => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-btn';
        btn.innerHTML = `📄 ${sample.name.replace(/_/g, ' ')}`;
        btn.addEventListener('click', () => {
          selectCandidateSampleResume(sample);
        });
        el.candidateSampleChips.appendChild(btn);
      });
    }
  }

  // ==========================================
  // RECRUITER LOGIC
  // ==========================================

  // Recruiter JD Character counter
  el.recruiterJdInput.addEventListener('input', () => {
    const len = el.recruiterJdInput.value.trim().length;
    el.recruiterCharCount.textContent = `${len} characters ${len < 30 ? '(min 30)' : '✓'}`;
    el.recruiterCharCount.style.color = len >= 30 ? 'var(--emerald-light)' : 'var(--text-muted)';
  });

  // Sample JDs click handlers
  el.recruiterSamplesBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    const key = btn.dataset.jdKey;
    const jd = state.samples.jds[key];
    if (jd) {
      el.recruiterJdInput.value = jd.description;
      el.recruiterJdInput.dispatchEvent(new Event('input'));
      showToast(`Loaded "${jd.title}" job description!`, 'success');
    }
  });

  // Recruiter Drag & Drop Setup
  function setupRecruiterDropzone() {
    const dropzone = el.recruiterDropzone;
    const fileInput = el.recruiterFileInput;

    el.recruiterBrowseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files || []);
      addRecruiterFiles(files);
    });

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      addRecruiterFiles(files);
      fileInput.value = ''; // Reset for re-selection
    });
  }

  function addRecruiterFiles(newFiles) {
    const allowed = ['.pdf', '.doc', '.docx'];
    let addedCount = 0;

    newFiles.forEach(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) {
        showToast(`Skipped "${file.name}": Unsupported format. Use PDF or DOCX.`);
        return;
      }
      // Check if duplicate
      const exists = state.recruiter.files.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        state.recruiter.files.push(file);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      renderRecruiterFileList();
    }
  }

  // Add bundled sample resumes for recruiter
  el.loadSampleResumesBtn.addEventListener('click', () => {
    if (state.samples.resumes.length === 0) {
      showToast('No bundled sample resumes found.');
      return;
    }
    state.samples.resumes.forEach(sample => {
      if (!state.recruiter.useSampleNames.includes(sample.filename)) {
        state.recruiter.useSampleNames.push(sample.filename);
      }
    });
    renderRecruiterFileList();
    showToast(`Added ${state.samples.resumes.length} bundled sample resumes!`, 'success');
  });

  function renderRecruiterFileList() {
    const container = el.recruiterFileItems;
    container.innerHTML = '';

    const totalFiles = state.recruiter.files.length + state.recruiter.useSampleNames.length;
    el.recruiterFileCount.textContent = `${totalFiles} file${totalFiles === 1 ? '' : 's'} selected`;

    if (totalFiles > 0) {
      el.recruiterClearFiles.classList.remove('hidden');
    } else {
      el.recruiterClearFiles.classList.add('hidden');
    }

    // Render uploaded files
    state.recruiter.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item-card';
      item.innerHTML = `
        <div class="file-item-icon">📄</div>
        <div class="file-item-info">
          <strong class="file-item-name">${escapeHtml(file.name)}</strong>
          <span class="file-item-size">${formatBytes(file.size)}</span>
        </div>
        <button type="button" class="file-remove-btn" data-index="${index}" title="Remove file">✕</button>
      `;
      item.querySelector('.file-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        state.recruiter.files.splice(index, 1);
        renderRecruiterFileList();
      });
      container.appendChild(item);
    });

    // Render sample names
    state.recruiter.useSampleNames.forEach((name, index) => {
      const item = document.createElement('div');
      item.className = 'file-item-card';
      item.style.borderColor = 'rgba(99, 102, 241, 0.3)';
      item.innerHTML = `
        <div class="file-item-icon">⚡</div>
        <div class="file-item-info">
          <strong class="file-item-name">${escapeHtml(name)} <span class="sample-badge">Bundled Sample</span></strong>
          <span class="file-item-size">Sample PDF</span>
        </div>
        <button type="button" class="file-remove-btn" title="Remove sample">✕</button>
      `;
      item.querySelector('.file-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        state.recruiter.useSampleNames.splice(index, 1);
        renderRecruiterFileList();
      });
      container.appendChild(item);
    });
  }

  el.recruiterClearFiles.addEventListener('click', () => {
    state.recruiter.files = [];
    state.recruiter.useSampleNames = [];
    renderRecruiterFileList();
  });

  // Recruiter Form Submit
  el.recruiterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jd = el.recruiterJdInput.value.trim();

    if (jd.length < 30) {
      showToast('Please provide a job description with at least 30 characters.');
      el.recruiterJdInput.focus();
      return;
    }

    const totalFiles = state.recruiter.files.length + state.recruiter.useSampleNames.length;
    if (totalFiles === 0) {
      showToast('Please upload at least one candidate resume or add sample resumes.');
      return;
    }

    const formData = new FormData();
    formData.append('job_description', jd);

    state.recruiter.files.forEach(file => {
      formData.append('resumes', file);
    });

    if (state.recruiter.useSampleNames.length > 0) {
      formData.append('use_samples', 'true');
      state.recruiter.useSampleNames.forEach(name => {
        formData.append('sample_names', name);
      });
    }

    startLoading('Parsing Job Description and scoring candidate resumes...', [
      'Extracting document semantics...',
      'Comparing technical competencies against JD requirements...',
      'Calculating match scores and fit verdicts...',
      'Generating candidate ranking leaderboard...'
    ]);

    try {
      const res = await fetch('/api/analyze/recruiter', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      stopLoading();

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed. Please try again.');
      }

      state.recruiter.lastResults = data;
      renderRecruiterResults(data);
      showScreen(el.screenRecruiterResults);
    } catch (err) {
      stopLoading();
      showToast(err.message || 'Error running resume analysis.');
    }
  });

  // Render Recruiter Results Dashboard
  function renderRecruiterResults(data) {
    el.recruiterResultsRoleTitle.textContent = data.role ? `${data.role} Shortlist` : 'Candidate Match Results';

    const results = data.results || [];
    const scores = results.map(r => r.score).filter(s => typeof s === 'number');

    const total = results.length;
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const qualified = scores.filter(s => s >= 70).length;

    el.metricTotalCandidates.textContent = total;
    el.metricTopScore.textContent = `${topScore}%`;
    el.metricAvgScore.textContent = `${avgScore}%`;
    el.metricQualifiedCount.textContent = qualified;

    // Filter counts
    el.filterCountAll.textContent = total;
    el.filterCountHigh.textContent = results.filter(r => (r.score || 0) >= 75).length;
    el.filterCountMid.textContent = results.filter(r => (r.score || 0) >= 50 && (r.score || 0) < 75).length;
    el.filterCountLow.textContent = results.filter(r => (r.score || 0) < 50).length;

    renderCandidateCards();
  }

  function renderCandidateCards() {
    const container = el.recruiterResultsContainer;
    container.innerHTML = '';

    if (!state.recruiter.lastResults || !state.recruiter.lastResults.results) return;

    let list = [...state.recruiter.lastResults.results];

    // Filter by Score Tier
    if (state.recruiter.activeFilter === 'high') {
      list = list.filter(r => (r.score || 0) >= 75);
    } else if (state.recruiter.activeFilter === 'mid') {
      list = list.filter(r => (r.score || 0) >= 50 && (r.score || 0) < 75);
    } else if (state.recruiter.activeFilter === 'low') {
      list = list.filter(r => (r.score || 0) < 50);
    }

    // Search query
    const q = state.recruiter.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(r => {
        const name = (r.name || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        const verdict = (r.details?.verdict || '').toLowerCase();
        const skills = (r.skills || []).join(' ').toLowerCase();
        return name.includes(q) || email.includes(q) || verdict.includes(q) || skills.includes(q);
      });
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="glass-panel" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <h3>No candidates match this filter or search</h3>
          <p>Try selecting "All Candidates" or adjusting your search keyword.</p>
        </div>
      `;
      return;
    }

    list.forEach((candidate, index) => {
      const score = candidate.score || 0;
      let scoreClass = 'score-low';
      let tierLabel = 'Low Alignment';
      if (score >= 75) {
        scoreClass = 'score-high';
        tierLabel = 'Strong Fit';
      } else if (score >= 50) {
        scoreClass = 'score-mid';
        tierLabel = 'Moderate Fit';
      }

      const details = candidate.details || {};
      const matchingSkills = details.matching_skills || candidate.skills || [];
      const missingSkills = details.missing_skills || [];
      const verdict = details.verdict || 'Candidate evaluation complete.';

      const card = document.createElement('div');
      card.className = `candidate-match-card ${index === 0 ? 'rank-1' : ''}`;

      card.innerHTML = `
        <div class="card-top-row">
          <div class="candidate-profile-meta">
            <div class="candidate-rank-badge">#${index + 1}</div>
            <div class="candidate-name-col">
              <h3>${escapeHtml(candidate.name || 'Candidate')} ${candidate.is_sample ? '<span class="sample-badge">Sample</span>' : ''}</h3>
              <div class="candidate-email-text">
                ${candidate.email ? `✉ ${escapeHtml(candidate.email)} · ` : ''}
                📄 ${escapeHtml(candidate.file_name || 'Resume')}
                ${candidate.experience !== null && candidate.experience !== undefined ? ` · ⏳ ${candidate.experience} Yrs Exp` : ''}
              </div>
            </div>
          </div>
          <div class="candidate-score-badge-wrap">
            <div class="score-badge ${scoreClass}">
              <span>${score}%</span>
            </div>
          </div>
        </div>

        <div class="verdict-box">
          "${escapeHtml(verdict)}"
        </div>

        <div class="skills-comparison-row">
          <div class="skills-col matched">
            <h4>✓ Matched Skills (${matchingSkills.length})</h4>
            <div class="skills-tags-wrap">
              ${matchingSkills.length > 0
                ? matchingSkills.slice(0, 8).map(s => `<span class="skill-tag tag-match">${escapeHtml(s)}</span>`).join('')
                : '<span class="skill-tag">None identified</span>'}
              ${matchingSkills.length > 8 ? `<span class="skill-tag">+${matchingSkills.length - 8} more</span>` : ''}
            </div>
          </div>
          <div class="skills-col missing">
            <h4>! Missing / Target Skills (${missingSkills.length})</h4>
            <div class="skills-tags-wrap">
              ${missingSkills.length > 0
                ? missingSkills.slice(0, 6).map(s => `<span class="skill-tag tag-miss">${escapeHtml(s)}</span>`).join('')
                : '<span class="skill-tag tag-match">No major skill gaps</span>'}
            </div>
          </div>
        </div>

        <div class="card-footer-row">
          <span>Tier: <strong>${tierLabel}</strong></span>
          <button type="button" class="btn-inspect" data-idx="${index}">
            <span>View Full Assessment</span>
            <span>→</span>
          </button>
        </div>
      `;

      card.querySelector('.btn-inspect').addEventListener('click', () => {
        openCandidateModal(candidate);
      });

      container.appendChild(card);
    });
  }

  // Recruiter Filter Pills
  el.recruiterScoreFilters.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    el.recruiterScoreFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.recruiter.activeFilter = pill.dataset.filter;
    renderCandidateCards();
  });

  // Recruiter Search
  el.recruiterCandidateSearch.addEventListener('input', (e) => {
    state.recruiter.searchQuery = e.target.value;
    renderCandidateCards();
  });

  // Modal Inspector
  function openCandidateModal(candidate) {
    el.modalName.textContent = candidate.name || 'Candidate Details';
    el.modalAvatar.textContent = (candidate.name || 'C').charAt(0).toUpperCase();
    el.modalSub.textContent = `${candidate.file_name || 'Resume'} · Match Score: ${candidate.score || 0}%`;

    const details = candidate.details || {};
    const highlights = details.highlights || [];
    const matchingSkills = details.matching_skills || candidate.skills || [];
    const missingSkills = details.missing_skills || [];

    el.modalBodyContent.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem;">AI Verdict</h4>
        <div class="verdict-box">"${escapeHtml(details.verdict || 'Evaluation completed.')}"</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div class="glass-panel" style="padding: 1rem;">
          <h4 style="font-size: 0.8rem; color: var(--emerald-light); margin-bottom: 0.5rem;">Matched Skills</h4>
          <div class="skills-tags-wrap">
            ${matchingSkills.map(s => `<span class="skill-tag tag-match">${escapeHtml(s)}</span>`).join('') || '<span class="text-muted">None</span>'}
          </div>
        </div>
        <div class="glass-panel" style="padding: 1rem;">
          <h4 style="font-size: 0.8rem; color: var(--amber-primary); margin-bottom: 0.5rem;">Missing Skills</h4>
          <div class="skills-tags-wrap">
            ${missingSkills.map(s => `<span class="skill-tag tag-miss">${escapeHtml(s)}</span>`).join('') || '<span class="text-muted">None</span>'}
          </div>
        </div>
      </div>

      ${highlights.length > 0 ? `
        <div>
          <h4 style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Key Highlights</h4>
          <ul class="highlights-list">
            ${highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    el.candidateDetailModal.classList.remove('hidden');
  }

  [el.modalCloseBtn, el.modalDismissBtn].forEach(btn => {
    btn.addEventListener('click', () => {
      el.candidateDetailModal.classList.add('hidden');
    });
  });

  el.candidateDetailModal.addEventListener('click', (e) => {
    if (e.target === el.candidateDetailModal) {
      el.candidateDetailModal.classList.add('hidden');
    }
  });

  // CSV Export for Recruiter
  el.exportJsonBtn.addEventListener('click', () => {
    if (!state.recruiter.lastResults || !state.recruiter.lastResults.results) return;
    const results = state.recruiter.lastResults.results;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Rank,Candidate Name,Email,Score (%),Experience (Yrs),Verdict,Matching Skills,Missing Skills\n';

    results.forEach((r, idx) => {
      const rank = idx + 1;
      const name = `"${(r.name || '').replace(/"/g, '""')}"`;
      const email = `"${(r.email || '').replace(/"/g, '""')}"`;
      const score = r.score || 0;
      const exp = r.experience || '';
      const verdict = `"${(r.details?.verdict || '').replace(/"/g, '""')}"`;
      const matching = `"${(r.details?.matching_skills || []).join(', ').replace(/"/g, '""')}"`;
      const missing = `"${(r.details?.missing_skills || []).join(', ').replace(/"/g, '""')}"`;
      csvContent += `${rank},${name},${email},${score},${exp},${verdict},${matching},${missing}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `talentmatch_candidates_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported candidate rankings to CSV!', 'success');
  });

  el.printRecruiterBtn.addEventListener('click', () => window.print());

  // ==========================================
  // JOB SEEKER / CANDIDATE LOGIC
  // ==========================================

  // Field selection cards
  el.careerFieldsGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.field-card');
    if (!card) return;
    el.careerFieldsGrid.querySelectorAll('.field-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    const field = card.dataset.field;
    state.candidate.selectedField = field;
    el.selectedCareerField.value = field;
  });

  // Custom field setter
  el.applyCustomFieldBtn.addEventListener('click', () => {
    const val = el.customFieldInput.value.trim();
    if (!val) {
      showToast('Please type a role title first.');
      return;
    }
    // Deselect existing preset cards
    el.careerFieldsGrid.querySelectorAll('.field-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });
    state.candidate.selectedField = val;
    el.selectedCareerField.value = val;
    showToast(`Target field set to "${val}"!`, 'success');
  });

  // Candidate Drag & Drop Setup
  function setupCandidateDropzone() {
    const dropzone = el.candidateDropzone;
    const fileInput = el.candidateFileInput;

    el.candidateBrowseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        selectCandidateFile(files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (files.length > 0) {
        selectCandidateFile(files[0]);
      }
      fileInput.value = '';
    });
  }

  function selectCandidateFile(file) {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showToast('Please upload a PDF or DOCX file.');
      return;
    }
    state.candidate.file = file;
    state.candidate.sampleName = null;

    el.candidateFileName.textContent = file.name;
    el.candidateFileSize.textContent = formatBytes(file.size);
    el.candidateFilePreview.classList.remove('hidden');
    el.candidateDropzone.classList.add('hidden');
  }

  function selectCandidateSampleResume(sample) {
    state.candidate.sampleName = sample.filename;
    state.candidate.file = null;

    el.candidateFileName.textContent = `${sample.name} (Bundled Demo)`;
    el.candidateFileSize.textContent = 'Demo PDF';
    el.candidateFilePreview.classList.remove('hidden');
    el.candidateDropzone.classList.add('hidden');
    showToast(`Loaded sample resume: ${sample.name}`, 'success');
  }

  el.candidateRemoveFile.addEventListener('click', () => {
    state.candidate.file = null;
    state.candidate.sampleName = null;
    el.candidateFilePreview.classList.add('hidden');
    el.candidateDropzone.classList.remove('hidden');
  });

  // Candidate Form Submit
  el.candidateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const field = state.candidate.selectedField || el.selectedCareerField.value;
    if (!field) {
      showToast('Please select a career field or specify a custom role.');
      return;
    }

    if (!state.candidate.file && !state.candidate.sampleName) {
      showToast('Please upload your resume or pick a demo profile.');
      return;
    }

    const formData = new FormData();
    formData.append('field', field);

    if (state.candidate.file) {
      formData.append('resume', state.candidate.file);
    } else if (state.candidate.sampleName) {
      formData.append('sample_name', state.candidate.sampleName);
    }

    startLoading('Evaluating your resume against industry benchmarks...', [
      'Extracting projects, skills, and work timeline...',
      'Comparing against target domain requirements...',
      'Synthesizing tailored career advice & highlight report...'
    ]);

    try {
      const res = await fetch('/api/analyze/individual', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      stopLoading();

      if (!res.ok) {
        throw new Error(data.error || 'Evaluation failed. Please try again.');
      }

      state.candidate.lastResult = data;
      renderCandidateReport(data);
      showScreen(el.screenCandidateResults);
    } catch (err) {
      stopLoading();
      showToast(err.message || 'Error evaluating resume.');
    }
  });

  // Render Job Seeker Report
  function renderCandidateReport(data) {
    el.candidateReportName.textContent = data.name ? `${data.name}'s Career Alignment` : 'Career Alignment Report';
    el.candidateTargetRole.textContent = `Target Field: ${data.role || state.candidate.selectedField || 'Career Match'}`;
    el.candidateEmailTag.textContent = data.email ? `Email: ${data.email}` : `File: ${data.file_name || 'Resume'}`;

    const score = Math.round(data.score || 0);

    // Animate radial gauge
    animateScoreGauge(score);

    // Tier badge
    if (score >= 80) {
      el.candidateTierBadge.textContent = '🌟 Strong Domain Fit';
      el.candidateTierBadge.style.color = 'var(--emerald-light)';
      el.candidateTierBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else if (score >= 60) {
      el.candidateTierBadge.textContent = '✨ Promising Candidate';
      el.candidateTierBadge.style.color = 'var(--indigo-light)';
      el.candidateTierBadge.style.borderColor = 'rgba(99, 102, 241, 0.4)';
    } else {
      el.candidateTierBadge.textContent = '⚠️ Emerging Fit / Bridge Gaps';
      el.candidateTierBadge.style.color = 'var(--amber-primary)';
      el.candidateTierBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    }

    const details = data.details || {};
    el.candidateVerdictQuote.textContent = `"${details.verdict || 'Resume evaluation completed.'}"`;

    // Experience status
    const expYears = data.experience !== null && data.experience !== undefined ? `${data.experience} Years Experience` : 'Experience Analyzed';
    el.candidateExpBadge.textContent = `⏳ ${expYears}`;

    if (details.experience_met === true) {
      el.candidateExpFit.textContent = '✓ Experience Criteria: Well Matched';
      el.candidateExpFit.style.color = 'var(--emerald-light)';
    } else if (details.experience_met === false) {
      el.candidateExpFit.textContent = 'ℹ Experience: Below Target Seniority';
      el.candidateExpFit.style.color = 'var(--amber-primary)';
    } else {
      el.candidateExpFit.textContent = '✓ Domain Alignment Evaluated';
    }

    // Matched skills
    const matched = details.matching_skills || data.skills || [];
    el.candidateMatchedSkills.innerHTML = matched.length > 0
      ? matched.map(s => `<span class="skill-tag tag-match">✓ ${escapeHtml(s)}</span>`).join('')
      : '<span class="skill-tag">No direct domain skill overlaps found</span>';

    // Missing skills
    const missing = details.missing_skills || [];
    el.candidateMissingSkills.innerHTML = missing.length > 0
      ? missing.map(s => `<span class="skill-tag tag-miss">! ${escapeHtml(s)}</span>`).join('')
      : '<span class="skill-tag tag-match">Great match! No critical missing competencies</span>';

    // Highlights
    const highlights = details.highlights || [];
    el.candidateHighlightsList.innerHTML = highlights.length > 0
      ? highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')
      : '<li>Demonstrates solid foundational background in technical and analytical problem solving.</li>';
  }

  function animateScoreGauge(targetScore) {
    const circumference = 364.4; // 2 * pi * 58
    const offset = circumference - (targetScore / 100) * circumference;

    el.candidateGaugeBar.style.stroke = targetScore >= 75 ? 'var(--emerald-primary)' : targetScore >= 50 ? 'var(--indigo-primary)' : 'var(--amber-primary)';
    el.candidateGaugeBar.style.strokeDashoffset = offset;

    // Number counter animation
    let current = 0;
    const step = () => {
      if (current < targetScore) {
        current++;
        el.candidateScoreNum.textContent = current;
        requestAnimationFrame(step);
      } else {
        el.candidateScoreNum.textContent = targetScore;
      }
    };
    requestAnimationFrame(step);
  }

  el.candidateRetryBtn.addEventListener('click', () => {
    showScreen(el.screenCandidate);
  });

  el.candidateSwitchFieldBtn.addEventListener('click', () => {
    showScreen(el.screenCandidate);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  el.printCandidateBtn.addEventListener('click', () => window.print());

  // ==========================================
  // GLOBAL LOADING ANIMATION
  // ==========================================
  let loadingInterval = null;

  function startLoading(initialMsg, sequence = []) {
    el.loadingOverlay.classList.remove('hidden');
    el.loadingStatusMsg.textContent = initialMsg;

    let index = 0;
    if (loadingInterval) clearInterval(loadingInterval);

    if (sequence.length > 0) {
      loadingInterval = setInterval(() => {
        if (index < sequence.length) {
          el.loadingStatusMsg.textContent = sequence[index];
          index++;
        }
      }, 3500);
    }
  }

  function stopLoading() {
    el.loadingOverlay.classList.add('hidden');
    if (loadingInterval) {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
  }

  // ==========================================
  // EVENT LISTENERS & INITIALIZATION
  // ==========================================

  function init() {
    // Welcome screen cards
    el.chooseRecruiterCard.addEventListener('click', () => setMode('recruiter'));
    el.chooseCandidateCard.addEventListener('click', () => setMode('candidate'));

    // Navigation buttons
    el.brandHome.addEventListener('click', () => setMode(null));
    el.switchRoleBtn.addEventListener('click', () => setMode(null));
    el.recruiterBackBtn.addEventListener('click', () => setMode(null));
    el.candidateBackBtn.addEventListener('click', () => setMode(null));
    el.recruiterResultsBackBtn.addEventListener('click', () => showScreen(el.screenRecruiter));
    el.candidateResultsBackBtn.addEventListener('click', () => showScreen(el.screenCandidate));

    // Guide Modal
    el.helpBtn.addEventListener('click', () => el.guideModal.classList.remove('hidden'));
    [el.guideCloseBtn, el.guideDismissBtn].forEach(btn => {
      btn.addEventListener('click', () => el.guideModal.classList.add('hidden'));
    });
    el.guideModal.addEventListener('click', (e) => {
      if (e.target === el.guideModal) el.guideModal.classList.add('hidden');
    });

    // Dropzones
    setupRecruiterDropzone();
    setupCandidateDropzone();

    // Fetch initial samples
    fetchSamples();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
