/* ============================================
   CODEMENTOR AI V3 — script.js
   Vercel-ready. No FastAPI required.
   Supports: LM Studio (local) + API Key (cloud)
   ============================================ */

/* ── State ── */
let editor;
let editorIsDark = true;
let analysisHistory = [];
const debugSessions = {};

/* ── Tab System ── */
let tabs = [];
let activeTabId = null;
let tabCounter = 1;

const LANG_STARTERS = {
    python:     '# Start coding here...\n\ndef solution():\n    pass\n',
    cpp:        '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Start coding here...\n    return 0;\n}\n',
    java:       'public class Main {\n    public static void main(String[] args) {\n        // Start coding here...\n    }\n}\n',
    javascript: '// Start coding here...\n\nfunction solution() {\n\n}\n'
};

const FILE_EXT   = { python: 'py', cpp: 'cpp', java: 'java', javascript: 'js' };
const LANG_LABELS = { python: 'Python', cpp: 'C++', java: 'Java', javascript: 'JavaScript' };
const MONACO_LANG = { python: 'python', cpp: 'cpp', java: 'java', javascript: 'javascript' };

/* ══════════════════════════════════════════
   LLM CONFIG — localStorage
   ══════════════════════════════════════════ */

const DEFAULT_CONFIG = {
    mode: 'lmstudio',
    lmstudio_url: 'http://localhost:1234',
    lmstudio_model: 'meta-llama-3.1-8b-instruct',
    api_url: 'https://openrouter.ai/api',
    api_key: '',
    api_model: 'meta-llama/llama-3.1-8b-instruct:free'
};

function getLLMConfig() {
    try {
        return Object.assign({}, DEFAULT_CONFIG, JSON.parse(localStorage.getItem('cm_config') || '{}'));
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

function saveLLMConfig(cfg) {
    localStorage.setItem('cm_config', JSON.stringify(cfg));
}

/* ══════════════════════════════════════════
   LLM ENGINE — OpenAI-compatible
   Works with LM Studio, OpenAI, OpenRouter,
   Groq, Anthropic (via proxy), or any
   OpenAI-compatible endpoint.
   ══════════════════════════════════════════ */

async function askLLM(userPrompt, systemPrompt = 'You are a coding mentor. Give hints only.') {
    const cfg = getLLMConfig();

    const isLMStudio = cfg.mode === 'lmstudio';
    const baseUrl    = isLMStudio ? cfg.lmstudio_url : cfg.api_url;
    const model      = isLMStudio ? cfg.lmstudio_model : cfg.api_model;

    if (!isLMStudio && !cfg.api_key) {
        throw new Error('NO_API_KEY');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (!isLMStudio && cfg.api_key) {
        headers['Authorization'] = `Bearer ${cfg.api_key}`;
    }

    // Some OpenRouter-specific headers (ignored by other providers)
    if (!isLMStudio) {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'CodeMentor AI';
    }

    const endpoint = baseUrl.replace(/\/$/, '') + '/v1/chat/completions';

    const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: userPrompt   }
            ],
            temperature: 0.7,
            max_tokens: 512
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${res.status}`;
        throw new Error(msg);
    }

    const data = await res.json();
    return data.choices[0].message.content;
}

/* ══════════════════════════════════════════
   CODE ANALYZER — ported from code_analyzer.py
   Multi-language regex-based static analysis.
   ══════════════════════════════════════════ */

function analyzeCodeStatic(code, lang = 'python') {
    const patterns = {
        python: {
            loops:      /\b(for|while)\s+/g,
            conditions: /\bif\s+/g,
            functions:  /\bdef\s+\w+\s*\(/g,
            variables:  /^\s*\w+\s*=[^=]/gm
        },
        javascript: {
            loops:      /\b(for|while|forEach)\s*[(\s]/g,
            conditions: /\bif\s*\(/g,
            functions:  /\b(function\s+\w+|const\s+\w+\s*=\s*(async\s*)?\(.*\)\s*=>|\w+\s*:\s*function)/g,
            variables:  /\b(let|const|var)\s+\w+/g
        },
        cpp: {
            loops:      /\b(for|while|do)\s*[(\s{]/g,
            conditions: /\bif\s*\(/g,
            functions:  /\b\w[\w\s*&]*\s+\w+\s*\([^)]*\)\s*\{/g,
            variables:  /\b(int|float|double|char|string|auto|bool)\s+\w+/g
        },
        java: {
            loops:      /\b(for|while|do)\s*[(\s]/g,
            conditions: /\bif\s*\(/g,
            functions:  /\b(public|private|protected|static)[\w\s]+\w+\s*\(/g,
            variables:  /\b(int|float|double|String|boolean|char|long|var)\s+\w+/g
        }
    };

    const p = patterns[lang] || patterns.python;

    return {
        status: 'valid',
        features: {
            loops:      (code.match(p.loops)      || []).length,
            conditions: (code.match(p.conditions) || []).length,
            functions:  (code.match(p.functions)  || []).length,
            variables:  (code.match(p.variables)  || []).length
        }
    };
}

/* ══════════════════════════════════════════
   STYLE DETECTOR — ported from style_detector.py
   ══════════════════════════════════════════ */

function detectAICode(code, lang = 'python') {
    const lines        = code.split('\n');
    const nonEmpty     = lines.filter(l => l.trim());
    const avgLineLen   = lines.reduce((s, l) => s + l.length, 0) / (lines.length + 1);
    const uniqueVars   = new Set((code.match(/\b[a-zA-Z_]\w*\b/g) || [])).size;
    const commentChar  = { python: '#', javascript: '//', cpp: '//', java: '//' }[lang] || '#';
    const commentLines = lines.filter(l => l.trim().startsWith(commentChar)).length;
    const indents      = nonEmpty.map(l => (l.match(/^\s*/)[0]).length);
    const avgIndent    = indents.reduce((a, b) => a + b, 0) / (indents.length + 1);

    let score = 0;
    if (avgLineLen > 25)               score++;
    if (uniqueVars < 6)                score++;
    if (commentLines === 0)            score++;
    if (Math.abs(avgIndent - 4) < 0.5) score++;

    return score >= 3 ? 'likely_ai_generated' : 'likely_human_written';
}

/* ══════════════════════════════════════════
   COGNITIVE MODEL — ported from cognitive_model.py
   Rule-based replica of the 4-sample RandomForest.
   Same decision boundaries, zero dependencies.
   ══════════════════════════════════════════ */

function predictCognitiveState(typing_speed, deletions, run_count, idle_time) {
    // Expert: fast typing, almost no deletions
    if (typing_speed >= 35 && deletions <= 2) return 'expert';
    // Confident: reasonably fast, low deletions
    if (typing_speed >= 25 && deletions <= 3) return 'confident';
    // Confused: very slow or long idle time
    if (typing_speed <= 7 || idle_time >= 25) return 'confused';
    // Default: struggling
    return 'struggling';
}

/* ══════════════════════════════════════════
   DEBUG ENGINE — ported from debug_engine.py
   ══════════════════════════════════════════ */

class DebugSession {
    constructor() {
        this.startTime = Date.now();
        this.attempts  = 0;
        this.errors    = 0;
        this.success   = false;
    }

    recordAttempt(hasError) {
        this.attempts++;
        if (hasError) this.errors++;
        else this.success = true;
    }

    calculateScore() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        if (!this.success) return 20;
        let score = 100 - (this.attempts * 5) - (this.errors * 3) - Math.floor(elapsed / 10);
        return Math.max(score, 10);
    }
}

/* ══════════════════════════════════════════
   STUDENT MEMORY — ported from student_memory.py
   Stored in localStorage instead of in-memory dict.
   ══════════════════════════════════════════ */

function updateStudentProfile(userId, score) {
    const key = `cm_profile_${userId}`;
    let profile;
    try {
        profile = JSON.parse(localStorage.getItem(key)) || null;
    } catch { profile = null; }

    if (!profile) {
        profile = { attempts: 0, total_score: 0, level: 'beginner' };
    }

    profile.attempts++;
    profile.total_score += score;
    const avg = profile.total_score / profile.attempts;

    if      (profile.attempts < 3) profile.level = 'beginner';
    else if (avg > 70)             profile.level = 'advanced';
    else if (avg > 40)             profile.level = 'intermediate';
    else                           profile.level = 'beginner';

    localStorage.setItem(key, JSON.stringify(profile));
    return profile;
}

/* ══════════════════════════════════════════
   HINT ENGINE — ported from llm_engine.py
   ══════════════════════════════════════════ */

async function getCodeHint(code, error = '', cognitiveState = 'beginner', lang = 'python') {
    const teaching = {
        confused:   'Explain very slowly. Use simple language. Ask guiding questions.',
        struggling: 'Give small logical hints. Do not reveal the answer.',
        confident:  'Challenge the student with deeper questions.',
        expert:     'Give a minimal hint and push optimization thinking.'
    };

    const style = teaching[cognitiveState] || 'Give a helpful hint.';

    const prompt = `You are an expert programming mentor.

Student cognitive state: ${cognitiveState}
Teaching style: ${style}
Language: ${lang}

Student code:
\`\`\`${lang}
${code}
\`\`\`

${error ? `Error:\n${error}\n` : ''}
Rules:
- NEVER give the full solution
- Give only hints or guiding questions
- Adjust your language complexity to match the cognitive state
- Keep your response under 120 words`;

    return await askLLM(prompt, 'You are a supportive, Socratic programming mentor. Never reveal full solutions.');
}

/* ══════════════════════════════════════════
   MONACO EDITOR INIT
   ══════════════════════════════════════════ */

require.config({
    paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs' }
});

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: '',
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13.5,
        lineHeight: 22,
        padding: { top: 16, bottom: 16 },
        minimap: { enabled: true, scale: 1 },
        scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
        renderLineHighlight: 'gutter',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: true,
        smoothScrolling: true,
        fontLigatures: true,
        letterSpacing: 0.3,
        roundedSelection: true,
        bracketPairColorization: { enabled: true }
    });

    editor.onDidChangeCursorPosition(e => {
        document.getElementById('lineColInfo').textContent =
            `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    editor.onDidChangeModelContent(() => {
        const val = editor.getValue();
        document.getElementById('charCount').textContent = `${val.length} chars`;
        if (activeTabId !== null) {
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab) tab.content = val;
        }
    });

    createTab('python', true);

    // Apply config-based status on load
    updateConfigBadge();
});

/* ══════════════════════════════════════════
   TAB SYSTEM
   ══════════════════════════════════════════ */

function createTab(lang = 'python', isFirst = false) {
    if (!editor) return;
    if (!isFirst && activeTabId !== null) {
        const cur = tabs.find(t => t.id === activeTabId);
        if (cur) cur.content = editor.getValue();
    }
    const id  = tabCounter++;
    const tab = { id, name: `main_${id}.${FILE_EXT[lang]}`, lang, content: LANG_STARTERS[lang] };
    tabs.push(tab);
    renderTabs();
    switchToTab(id);
}

function switchToTab(id) {
    if (!editor) return;
    if (activeTabId !== null && activeTabId !== id) {
        const cur = tabs.find(t => t.id === activeTabId);
        if (cur) cur.content = editor.getValue();
    }
    activeTabId = id;
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    monaco.editor.setModelLanguage(editor.getModel(), MONACO_LANG[tab.lang]);
    editor.setValue(tab.content);
    document.getElementById('langSelect').value     = tab.lang;
    document.getElementById('langIndicator').textContent = LANG_LABELS[tab.lang];
    renderTabs();
}

function closeTab(id, event) {
    event.stopPropagation();
    if (tabs.length === 1) { showToast('Cannot close the last tab', 'error'); return; }
    const idx = tabs.findIndex(t => t.id === id);
    tabs.splice(idx, 1);
    if (activeTabId === id) {
        activeTabId = null;
        const next = tabs[Math.min(idx, tabs.length - 1)];
        if (next) switchToTab(next.id);
    } else {
        renderTabs();
    }
}

function addTab() {
    const lang = document.getElementById('langSelect').value || 'python';
    createTab(lang);
}

function renderTabs() {
    const bar    = document.getElementById('tabBar');
    const addBtn = document.getElementById('tabAddBtn');
    bar.querySelectorAll('.file-tab').forEach(el => el.remove());
    tabs.forEach(tab => {
        const el = document.createElement('div');
        el.className = 'file-tab' + (tab.id === activeTabId ? ' active' : '');
        el.onclick = () => switchToTab(tab.id);
        el.innerHTML = `
            <span class="tab-lang-dot ${tab.lang}"></span>
            <span>${tab.name}</span>
            <button class="tab-close" onclick="closeTab(${tab.id}, event)" title="Close tab">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>`;
        bar.insertBefore(el, addBtn);
    });
}

/* ── Language Switch ── */
function switchLanguage(lang) {
    if (!editor || activeTabId === null) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;
    tab.lang    = lang;
    tab.name    = `main_${tab.id}.${FILE_EXT[lang]}`;
    tab.content = LANG_STARTERS[lang];
    monaco.editor.setModelLanguage(editor.getModel(), MONACO_LANG[lang]);
    editor.setValue(tab.content);
    document.getElementById('langIndicator').textContent = LANG_LABELS[lang];
    renderTabs();
}

/* ── Editor Theme Toggle ── */
function toggleEditorTheme() {
    if (!editor) return;
    editorIsDark = !editorIsDark;
    monaco.editor.setTheme(editorIsDark ? 'vs-dark' : 'vs');
    const darkIcon    = document.getElementById('themeIconDark');
    const lightIcon   = document.getElementById('themeIconLight');
    const label       = document.getElementById('themeLabel');
    const statusLabel = document.getElementById('editorThemeLabel');
    const btn         = document.getElementById('themeToggleBtn');
    if (editorIsDark) {
        darkIcon.style.display  = ''; lightIcon.style.display = 'none';
        label.textContent = 'Light'; statusLabel.textContent = 'Dark';
        btn.classList.remove('light-active');
    } else {
        darkIcon.style.display  = 'none'; lightIcon.style.display = '';
        label.textContent = 'Dark'; statusLabel.textContent = 'Light';
        btn.classList.add('light-active');
    }
    showToast(`Editor: ${editorIsDark ? 'Dark' : 'Light'} mode`, 'info');
}

/* ── Utilities ── */
function clearEditor() {
    if (!editor || activeTabId === null) return;
    const tab = tabs.find(t => t.id === activeTabId);
    const starter = LANG_STARTERS[tab ? tab.lang : 'python'];
    editor.setValue(starter);
    if (tab) tab.content = starter;
    showToast('Editor cleared', 'info');
}

function copyCode() {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getValue()).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.classList.add('copied');
        showToast('Code copied to clipboard', 'success');
        setTimeout(() => btn.classList.remove('copied'), 2000);
    });
}

/* ══════════════════════════════════════════
   MAIN ANALYZE FLOW
   All logic is now local JS — no FastAPI needed.
   ══════════════════════════════════════════ */

async function analyzeCode() {
    const userId = document.getElementById('userId').value.trim();
    const code   = editor ? editor.getValue() : '';

    if (!userId)      { showToast('Please enter a User ID', 'error'); return; }
    if (!code.trim()) { showToast('Editor is empty', 'error'); return; }

    // Check config before running
    const cfg = getLLMConfig();
    if (cfg.mode === 'apikey' && !cfg.api_key) {
        openSettings();
        showToast('API Key missing — open Settings to configure', 'error');
        return;
    }

    setLoadingState(true);

    try {
        // Active tab language
        const activeTab = tabs.find(t => t.id === activeTabId);
        const lang      = activeTab ? activeTab.lang : 'python';

        // ── 1. Static code analysis (ported from code_analyzer.py) ──
        const analysis = analyzeCodeStatic(code, lang);
        const hasError = analysis.status === 'error';

        // ── 2. Cognitive model (default behavioral inputs) ──
        const state = predictCognitiveState(10, 5, 3, 5);

        // ── 3. Debug session tracking ──
        if (!debugSessions[userId]) debugSessions[userId] = new DebugSession();
        const session = debugSessions[userId];
        session.recordAttempt(hasError);
        const score = session.calculateScore();

        // ── 4. AI code detection (ported from style_detector.py) ──
        const aiFlag = detectAICode(code, lang);

        // ── 5. Student memory (localStorage) ──
        const profile = updateStudentProfile(userId, score);

        // ── 6. LLM hint (async call to LM Studio or API) ──
        setSystemStatus('analyzing', 'Asking AI…');
        const hint = await getCodeHint(code, hasError ? analysis.message : '', state, lang);

        // ── 7. Render ──
        const data = {
            cognitive_state: state,
            student_level:   profile.level,
            hint,
            debug_score:     score,
            code_authorship: aiFlag,
            error:           hasError ? analysis.message : null,
            attempts:        profile.attempts
        };

        renderResults(data);
        addHistory(data);
        showToast('Analysis complete ✓', 'success');

    } catch (err) {
        console.error(err);
        setSystemStatus('error', 'LLM unreachable');

        if (err.message === 'NO_API_KEY') {
            openSettings();
            showToast('API Key not set — configure in Settings', 'error');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            const cfg = getLLMConfig();
            const hint = cfg.mode === 'lmstudio'
                ? 'Is LM Studio running? Enable CORS in LM Studio → Settings → Server.'
                : 'Network error — check your API URL and key.';
            showToast(hint, 'error');
        } else {
            showToast(`Error: ${err.message}`, 'error');
        }
        setTimeout(() => setSystemStatus('ready', 'System Ready'), 5000);
    } finally {
        setLoadingState(false);
    }
}

/* ══════════════════════════════════════════
   RENDER RESULTS
   ══════════════════════════════════════════ */

function renderResults(data) {
    const state   = (data.cognitive_state || '').toLowerCase();
    const cogCard = document.getElementById('cognitiveCard');
    cogCard.className = 'cognitive-card ' +
        (['confident','confused','frustrated','struggling','expert'].includes(state) ? state : '');
    document.getElementById('state').textContent    = data.cognitive_state || '—';
    document.getElementById('level').textContent    = data.student_level   || '—';
    document.getElementById('attempts').textContent = data.attempts != null ? data.attempts : '—';

    animateScore(parseFloat(data.debug_score) || 0);
    renderAIDetection(data.code_authorship || '');

    const hasError = data.error && data.error !== 'None' && data.error !== 'No error';
    document.getElementById('errorCard').style.display = hasError ? 'block' : 'none';
    if (hasError) document.getElementById('errorOutput').textContent = data.error;

    renderHint(data.hint || '');
    renderHintBadge(data.student_level);
}

function animateScore(score) {
    const clamped = Math.min(Math.max(score, 0), 100);
    document.getElementById('score').textContent = Math.round(score);
    document.getElementById('scoreRing').style.strokeDashoffset = 201 - (clamped / 100) * 201;
}

function renderAIDetection(authorship) {
    const badge = document.getElementById('aiBadge');
    const fill  = document.getElementById('detectionFill');
    const label = document.getElementById('ai');
    const lower = authorship.toLowerCase();

    if (lower.includes('ai')) {
        badge.textContent = 'AI GEN'; badge.className = 'panel-badge ai-gen';
        fill.style.width  = '85%';
        label.textContent = 'Likely AI-generated code detected';
    } else if (lower.includes('human')) {
        badge.textContent = 'HUMAN'; badge.className = 'panel-badge human';
        fill.style.width  = '20%';
        label.textContent = 'Likely human-written code';
    } else {
        badge.textContent = authorship || '—'; badge.className = 'panel-badge neutral';
        fill.style.width  = '50%';
        label.textContent = authorship || 'Inconclusive';
    }
}

function renderHint(hint) {
    const el = document.getElementById('hint');
    el.innerHTML = '<span class="typed-hint"></span><span class="cursor"></span>';
    typeWriter(el.querySelector('.typed-hint'), hint, 16);
}

function renderHintBadge(level) {
    const badge = document.getElementById('hintLevelBadge');
    const l = (level || '').toLowerCase();
    badge.textContent = l ? level.toUpperCase() : '';
    badge.className   = 'hint-level-badge' + (l ? ' ' + l : '');
}

function typeWriter(el, text, speed = 16) {
    let i = 0; el.textContent = '';
    const iv = setInterval(() => {
        el.textContent += text[i++];
        if (i >= text.length) clearInterval(iv);
    }, speed);
}

/* ── History ── */
function addHistory(data) {
    const ts  = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const err = data.error && data.error !== 'None';
    analysisHistory.unshift({ ts, err, score: data.debug_score });
    if (analysisHistory.length > 8) analysisHistory.pop();
    renderHistory();
}

function renderHistory() {
    const body = document.getElementById('historyBody');
    if (!analysisHistory.length) {
        body.innerHTML = '<p class="empty-history">No analyses yet this session</p>';
        return;
    }
    body.innerHTML = analysisHistory.map(item => `
        <div class="history-item">
            <div class="history-item-left">
                <span class="history-dot ${item.err ? 'error' : 'success'}"></span>
                <span class="history-label">${item.ts}</span>
            </div>
            <span class="history-score">${item.score != null ? item.score + ' pts' : '—'}</span>
        </div>
    `).join('');
}

/* ── UI State ── */
function setLoadingState(loading) {
    const btn = document.getElementById('analyzeBtn');
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
    if (!loading) setSystemStatus('ready', 'System Ready');
}

function setSystemStatus(type, text) {
    const pill = document.getElementById('systemStatus');
    pill.className = 'status-pill ' + (type === 'ready' ? '' : type);
    pill.querySelector('.status-text').textContent = text;
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className   = 'toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, 3800);
}

/* ══════════════════════════════════════════
   SETTINGS MODAL
   ══════════════════════════════════════════ */

function openSettings() {
    const cfg = getLLMConfig();
    const modal = document.getElementById('settingsModal');

    // Populate fields
    document.getElementById('cfg_mode').value          = cfg.mode;
    document.getElementById('cfg_lmstudio_url').value  = cfg.lmstudio_url;
    document.getElementById('cfg_lmstudio_model').value= cfg.lmstudio_model;
    document.getElementById('cfg_api_url').value       = cfg.api_url;
    document.getElementById('cfg_api_key').value       = cfg.api_key;
    document.getElementById('cfg_api_model').value     = cfg.api_model;

    toggleSettingsMode(cfg.mode);
    modal.classList.add('open');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('open');
}

function toggleSettingsMode(mode) {
    const lmSection  = document.getElementById('lmstudio_section');
    const apiSection = document.getElementById('apikey_section');
    if (mode === 'lmstudio') {
        lmSection.style.display  = 'block';
        apiSection.style.display = 'none';
    } else {
        lmSection.style.display  = 'none';
        apiSection.style.display = 'block';
    }
}

function setProviderPreset(provider) {
    const presets = {
        openai:      { url: 'https://api.openai.com',        model: 'gpt-4o-mini' },
        openrouter:  { url: 'https://openrouter.ai/api',     model: 'meta-llama/llama-3.1-8b-instruct:free' },
        groq:        { url: 'https://api.groq.com/openai',   model: 'llama-3.1-8b-instant' },
        together:    { url: 'https://api.together.xyz',      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo' },
        custom:      { url: '',                              model: '' }
    };
    const p = presets[provider];
    if (!p) return;
    if (p.url)   document.getElementById('cfg_api_url').value   = p.url;
    if (p.model) document.getElementById('cfg_api_model').value = p.model;
}

function saveSettings() {
    const mode = document.getElementById('cfg_mode').value;
    const cfg = {
        mode,
        lmstudio_url:   document.getElementById('cfg_lmstudio_url').value.trim().replace(/\/$/, ''),
        lmstudio_model: document.getElementById('cfg_lmstudio_model').value.trim(),
        api_url:        document.getElementById('cfg_api_url').value.trim().replace(/\/$/, ''),
        api_key:        document.getElementById('cfg_api_key').value.trim(),
        api_model:      document.getElementById('cfg_api_model').value.trim()
    };

    // Validate
    if (mode === 'lmstudio' && !cfg.lmstudio_url) {
        showToast('LM Studio URL cannot be empty', 'error'); return;
    }
    if (mode === 'apikey' && !cfg.api_key) {
        showToast('API Key cannot be empty', 'error'); return;
    }
    if (mode === 'apikey' && !cfg.api_url) {
        showToast('API URL cannot be empty', 'error'); return;
    }

    saveLLMConfig(cfg);
    updateConfigBadge();
    closeSettings();
    showToast('Settings saved ✓', 'success');
}

async function testConnection() {
    const btn = document.getElementById('testConnBtn');
    btn.disabled    = true;
    btn.textContent = 'Testing…';

    // Temporarily apply current form values for the test
    const mode = document.getElementById('cfg_mode').value;
    const tempCfg = {
        mode,
        lmstudio_url:   document.getElementById('cfg_lmstudio_url').value.trim().replace(/\/$/, ''),
        lmstudio_model: document.getElementById('cfg_lmstudio_model').value.trim(),
        api_url:        document.getElementById('cfg_api_url').value.trim().replace(/\/$/, ''),
        api_key:        document.getElementById('cfg_api_key').value.trim(),
        api_model:      document.getElementById('cfg_api_model').value.trim()
    };

    // Save temp, test, then compare
    const prev = localStorage.getItem('cm_config');
    saveLLMConfig(tempCfg);

    try {
        const reply = await askLLM('Say exactly: CONNECTED', 'You are a test assistant.');
        if (reply && reply.length > 0) {
            btn.textContent = '✓ Connected!';
            btn.style.color = 'var(--accent)';
            showToast('Connection successful!', 'success');
        }
    } catch (err) {
        btn.textContent = '✗ Failed';
        btn.style.color = '#ff4d4d';
        const msg = err.message === 'NO_API_KEY'
            ? 'API Key is empty'
            : err.message.includes('Failed to fetch')
                ? mode === 'lmstudio'
                    ? 'Cannot reach LM Studio. Is it running with CORS enabled?'
                    : 'Network error. Check the API URL.'
                : err.message;
        showToast(`Test failed: ${msg}`, 'error');
        // Restore previous config if test failed
        if (prev) localStorage.setItem('cm_config', prev);
        else localStorage.removeItem('cm_config');
    } finally {
        setTimeout(() => {
            btn.disabled    = false;
            btn.textContent = 'Test Connection';
            btn.style.color = '';
        }, 3000);
    }
}

function updateConfigBadge() {
    const cfg   = getLLMConfig();
    const badge = document.getElementById('configBadge');
    if (!badge) return;

    if (cfg.mode === 'lmstudio') {
        badge.textContent = `⚡ LM Studio`;
        badge.className   = 'config-badge lmstudio';
    } else {
        const model = cfg.api_model.split('/').pop().split(':')[0];
        badge.textContent = `🔑 ${model || 'API Key'}`;
        badge.className   = 'config-badge apikey';
    }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') closeSettings();
});

// ESC to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
});
