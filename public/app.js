/**
 * رفيق زرادشت (Zarathustra Companion) - Frontend Controller with Live AI Diagnostics
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabs = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // Image Upload Elements
  const dropZone = document.getElementById('dropZone');
  const imageInput = document.getElementById('imageInput');
  const dropContent = document.getElementById('dropContent');
  const previewContainer = document.getElementById('previewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const btnRemoveImage = document.getElementById('btnRemoveImage');
  
  // Text Input & Samples
  const textInput = document.getElementById('textInput');
  const sampleChips = document.querySelectorAll('.quote-chip');
  
  // Document Upload
  const fileDropZone = document.getElementById('fileDropZone');
  const docFileInput = document.getElementById('docFileInput');
  const docExtractPreview = document.getElementById('docExtractPreview');
  const docFileName = document.getElementById('docFileName');
  const docExtractedText = document.getElementById('docExtractedText');
  const btnRemoveDoc = document.getElementById('btnRemoveDoc');

  // Controls & Action
  const modeCards = document.querySelectorAll('.mode-card');
  const customUserPrompt = document.getElementById('customUserPrompt');
  const btnAnalyze = document.getElementById('btnAnalyze');
  
  // Output Workspace
  const outputPlaceholder = document.getElementById('outputPlaceholder');
  const analysisContentArea = document.getElementById('analysisContentArea');
  const streamingBadge = document.getElementById('streamingBadge');
  const analysisOutput = document.getElementById('analysisOutput');
  const outputTools = document.getElementById('outputTools');
  const followupChatSection = document.getElementById('followupChatSection');
  const chatHistory = document.getElementById('chatHistory');
  const chatInput = document.getElementById('chatInput');
  const btnSendChat = document.getElementById('btnSendChat');

  // Tool Buttons
  const btnSpeak = document.getElementById('btnSpeak');
  const btnCopyAnalysis = document.getElementById('btnCopyAnalysis');
  const btnSaveToJournal = document.getElementById('btnSaveToJournal');
  const btnSimplifyMore = document.getElementById('btnSimplifyMore');

  // Modals & Navigation
  const btnGlossary = document.getElementById('btnGlossary');
  const btnJournal = document.getElementById('btnJournal');
  const btnSettings = document.getElementById('btnSettings');
  const glossaryModal = document.getElementById('glossaryModal');
  const journalModal = document.getElementById('journalModal');
  const settingsModal = document.getElementById('settingsModal');
  const glossarySearch = document.getElementById('glossarySearch');
  const glossaryList = document.getElementById('glossaryList');
  const journalList = document.getElementById('journalList');
  const journalCountBadge = document.getElementById('journalCount');
  const btnExportJournal = document.getElementById('btnExportJournal');
  const btnClearJournal = document.getElementById('btnClearJournal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const btnToggleKeyVisibility = document.getElementById('btnToggleKeyVisibility');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const apiStatusBadge = document.getElementById('apiStatusBadge');

  // State
  let currentImageBase64 = null;
  let currentImageFile = null;
  let currentRawAnalysis = '';
  let currentContextQuote = '';
  let activeTab = 'tab-image';
  let chatConversation = [];
  let isSpeaking = false;
  let speechUtterance = null;
  let glossaryData = [];

  // Initialize
  initApp();

  function initApp() {
    setupTabs();
    setupImageHandlers();
    setupTextHandlers();
    setupDocHandlers();
    setupModeSelectors();
    setupAnalysisActions();
    setupModals();
    setupChat();
    setupGlobalPaste();
    loadGlossary();
    refreshJournalFromDb();
    checkApiStatus();
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function setupTabs() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        activeTab = target;
        tabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(target).classList.add('active');
      });
    });
  }

  function setupModeSelectors() {
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });
  }

  function getSelectedMode() {
    const checked = document.querySelector('input[name="analysisMode"]:checked');
    return checked ? checked.value : 'full';
  }

  function setupImageHandlers() {
    dropZone.addEventListener('click', (e) => {
      if (e.target !== btnRemoveImage && !btnRemoveImage.contains(e.target)) {
        imageInput.click();
      }
    });

    imageInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    btnRemoveImage.addEventListener('click', (e) => {
      e.stopPropagation();
      clearImage();
    });
  }

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)', 'error');
      return;
    }

    currentImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentImageBase64 = e.target.result;
      imagePreview.src = currentImageBase64;
      dropContent.classList.add('hidden');
      previewContainer.classList.remove('hidden');
      showToast('تم تحميل صورة الصفحة بنجاح!', 'success');
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    currentImageFile = null;
    currentImageBase64 = null;
    imageInput.value = '';
    imagePreview.src = '';
    previewContainer.classList.add('hidden');
    dropContent.classList.remove('hidden');
  }

  function setupGlobalPaste() {
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          handleImageFile(blob);
          const imgTabBtn = document.querySelector('[data-tab="tab-image"]');
          if (imgTabBtn) imgTabBtn.click();
          showToast('تم لصق لقطة الشاشة من الحافظة مباشرة!', 'success');
          break;
        }
      }
    });
  }

  function setupTextHandlers() {
    sampleChips.forEach(chip => {
      chip.addEventListener('click', () => {
        textInput.value = chip.dataset.quote;
        showToast('تم اختيار المقتطف النموذجي', 'info');
      });
    });
  }

  function setupDocHandlers() {
    fileDropZone.addEventListener('click', () => docFileInput.click());
    
    docFileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        uploadAndParseDoc(file);
      }
    });

    btnRemoveDoc.addEventListener('click', () => {
      docFileInput.value = '';
      docExtractedText.value = '';
      docExtractPreview.classList.add('hidden');
      fileDropZone.classList.remove('hidden');
    });
  }

  async function uploadAndParseDoc(file) {
    const formData = new FormData();
    formData.append('file', file);

    showToast('جاري استخراج النصوص من الملف...', 'info');

    try {
      const resp = await fetch('/api/parse-doc', {
        method: 'POST',
        body: formData
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'فشل قراءة الملف');

      docFileName.querySelector('span').textContent = data.filename + (data.pages ? ` (${data.pages} صفحة)` : '');
      docExtractedText.value = data.text;
      fileDropZone.classList.add('hidden');
      docExtractPreview.classList.remove('hidden');
      showToast('تم استخراج النص بنجاح!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function setupAnalysisActions() {
    btnAnalyze.addEventListener('click', () => executeAnalysis());
    
    btnSimplifyMore.addEventListener('click', () => {
      const kahwaRadio = document.querySelector('input[name="analysisMode"][value="kahwa"]');
      if (kahwaRadio) {
        kahwaRadio.checked = true;
        modeCards.forEach(c => c.classList.remove('active'));
        kahwaRadio.closest('.mode-card').classList.add('active');
      }
      executeAnalysis('kahwa');
    });

    btnCopyAnalysis.addEventListener('click', () => {
      if (!currentRawAnalysis) return;
      navigator.clipboard.writeText(currentRawAnalysis);
      showToast('تم نسخ التحليل بالكامل إلى الحافظة!', 'success');
    });

    btnSaveToJournal.addEventListener('click', () => saveCurrentToJournal());

    btnSpeak.addEventListener('click', () => toggleSpeech());
  }

  async function executeAnalysis(overrideMode = null) {
    let textToAnalyze = '';
    let imageBase64 = null;

    if (activeTab === 'tab-image') {
      imageBase64 = currentImageBase64;
    } else if (activeTab === 'tab-text') {
      textToAnalyze = textInput.value.trim();
    } else if (activeTab === 'tab-file') {
      textToAnalyze = docExtractedText.value.trim();
    }

    if (!imageBase64 && !textToAnalyze) {
      if (textInput.value.trim()) textToAnalyze = textInput.value.trim();
      else if (docExtractedText.value.trim()) textToAnalyze = docExtractedText.value.trim();
      else if (currentImageBase64) imageBase64 = currentImageBase64;
    }

    const userPrompt = customUserPrompt.value.trim();
    const mode = overrideMode || getSelectedMode();

    if (!imageBase64 && !textToAnalyze && !userPrompt) {
      showToast('يرجى وضع صورة أو نص أو كتابة سؤال للتحليل', 'error');
      return;
    }

    currentContextQuote = textToAnalyze || 'صورة صفحة من كتاب زرادشت';

    outputPlaceholder.classList.add('hidden');
    analysisContentArea.classList.remove('hidden');
    outputTools.style.display = 'flex';
    streamingBadge.classList.remove('hidden');
    analysisOutput.innerHTML = '';
    currentRawAnalysis = '';
    btnAnalyze.disabled = true;
    btnAnalyze.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>جاري التفكيك والتحليل...</span>';

    chatConversation = [];
    chatHistory.innerHTML = '';
    followupChatSection.classList.add('hidden');

    try {
      const storedKey = localStorage.getItem('zarathustra_gemini_key') || '';
      
      const payload = {
        text: textToAnalyze,
        prompt: userPrompt,
        mode: mode,
        imageBase64: imageBase64,
        customKey: storedKey
      };

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': storedKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `خطأ من الخادم (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.replace('data: ', '');
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.chunk) {
                currentRawAnalysis += parsed.chunk;
                analysisOutput.innerHTML = marked.parse(currentRawAnalysis);
              }
            } catch (jsonErr) {
              if (dataStr !== '[DONE]') {
                console.error('SSE parse error:', jsonErr);
              }
            }
          }
        }
      }

      streamingBadge.classList.add('hidden');

      if (!currentRawAnalysis.trim()) {
        throw new Error('لم يتم استلام أي رد من السيرفر. يرجى التحقق من إعدادات المفتاح في Vercel.');
      }

      followupChatSection.classList.remove('hidden');
      showToast('اكتمل الشرح والتحليل الفلسفي!', 'success');

    } catch (err) {
      streamingBadge.classList.add('hidden');
      analysisOutput.innerHTML = `
        <div class="settings-status error" style="padding:16px;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:22px;"></i>
          <div>
            <strong>تنبيه من السيرفر:</strong>
            <p style="margin-top:6px; color:#fff;">${err.message}</p>
            <small style="color:var(--gold-300);">💡 إذا كنت على Vercel، تأكد من إضافة <b>GOOGLE_SERVICE_ACCOUNT_KEY</b> أو <b>GEMINI_API_KEY</b> في إعدادات Vercel.</small>
          </div>
        </div>
      `;
      showToast(err.message, 'error');
    } finally {
      btnAnalyze.disabled = false;
      btnAnalyze.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>فكك واشرح بالعراقي</span>';
    }
  }

  function setupChat() {
    btnSendChat.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  async function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    appendChatMessage('user', msg);
    chatInput.value = '';

    const modelMsgEl = appendChatMessage('model', '...');
    let modelAccumulated = '';

    try {
      const storedKey = localStorage.getItem('zarathustra_gemini_key') || '';
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': storedKey
        },
        body: JSON.stringify({
          history: chatConversation,
          message: msg,
          contextQuote: currentContextQuote,
          customKey: storedKey
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.replace('data: ', ''));
              if (parsed.chunk) {
                modelAccumulated += parsed.chunk;
                modelMsgEl.innerHTML = marked.parse(modelAccumulated);
                chatHistory.scrollTop = chatHistory.scrollHeight;
              }
            } catch (e) {}
          }
        }
      }

      chatConversation.push({ role: 'user', content: msg });
      chatConversation.push({ role: 'model', content: modelAccumulated });

    } catch (err) {
      modelMsgEl.innerHTML = `<span style="color:var(--accent-red)">حدث خطأ: ${err.message}</span>`;
    }
  }

  function appendChatMessage(role, text) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg ${role}`;
    msgEl.innerHTML = marked.parse(text);
    chatHistory.appendChild(msgEl);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return msgEl;
  }

  function toggleSpeech() {
    if (!('speechSynthesis' in window)) {
      showToast('المتصفح لا يدعم القراءة الصوتية', 'error');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      return;
    }

    if (!currentRawAnalysis) return;

    const cleanText = currentRawAnalysis.replace(/[#*`_~\[\]]/g, '');
    speechUtterance = new SpeechSynthesisUtterance(cleanText);
    speechUtterance.lang = 'ar-SA';
    speechUtterance.rate = 0.95;

    speechUtterance.onend = () => {
      isSpeaking = false;
      btnSpeak.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    };

    window.speechSynthesis.speak(speechUtterance);
    isSpeaking = true;
    btnSpeak.innerHTML = '<i class="fa-solid fa-stop"></i>';
    showToast('جاري القراءة الصوتية...', 'info');
  }

  async function saveCurrentToJournal() {
    if (!currentRawAnalysis) {
      showToast('لا يوجد تحليل لحفظه', 'error');
      return;
    }

    try {
      const resp = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: currentContextQuote,
          analysis: currentRawAnalysis,
          mode: getSelectedMode(),
          deviceInfo: navigator.userAgent
        })
      });

      if (resp.ok) {
        showToast('تم حفظ التحليل في قاعدة بيانات السيرفر بنجاح!', 'success');
        refreshJournalFromDb();
      } else {
        throw new Error('فشل الحفظ في السيرفر');
      }
    } catch (err) {
      const journal = JSON.parse(localStorage.getItem('zarathustra_journal') || '[]');
      journal.unshift({
        id: Date.now(),
        quote: currentContextQuote,
        analysis: currentRawAnalysis,
        date: new Date().toLocaleString('ar-IQ')
      });
      localStorage.setItem('zarathustra_journal', JSON.stringify(journal));
      journalCountBadge.textContent = journal.length;
      showToast('تم الحفظ محلياً في المتصفح', 'info');
    }
  }

  async function refreshJournalFromDb() {
    try {
      const resp = await fetch('/api/journal');
      if (resp.ok) {
        const list = await resp.json();
        journalCountBadge.textContent = list.length;
      }
    } catch (e) {
      const journal = JSON.parse(localStorage.getItem('zarathustra_journal') || '[]');
      journalCountBadge.textContent = journal.length;
    }
  }

  async function renderJournal() {
    let items = [];
    try {
      const resp = await fetch('/api/journal');
      if (resp.ok) {
        items = await resp.json();
      }
    } catch (e) {
      items = JSON.parse(localStorage.getItem('zarathustra_journal') || '[]');
    }

    if (!items || items.length === 0) {
      journalList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px;">دفتر القراءة فارغ حالياً في قاعدة البيانات. احفظ أي اقتباس وتحليله بالضغط على زر الحفظ ⭐</p>';
      return;
    }

    journalList.innerHTML = items.map(item => `
      <div class="journal-item" data-id="${item.id}">
        <div class="journal-item-header">
          <span class="journal-date"><i class="fa-regular fa-clock"></i> ${item.created_at || item.date || ''}</span>
          <button class="btn-text-sm danger btn-del-journal" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
        <blockquote style="font-size:13px; color:var(--gold-300); border-right:3px solid var(--gold-500); padding:4px 10px; margin:0;">
          ${(item.quote || '').length > 120 ? item.quote.substring(0, 120) + '...' : item.quote}
        </blockquote>
        <div class="markdown-body" style="font-size:13px; max-height:160px; overflow-y:auto;">
          ${marked.parse((item.analysis || '').substring(0, 350) + '...')}
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.btn-del-journal').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await fetch(`/api/journal/${id}`, { method: 'DELETE' });
        } catch (e) {}
        renderJournal();
        refreshJournalFromDb();
        showToast('تم حذف الملاحظة من قاعدة البيانات', 'info');
      });
    });
  }

  function setupModals() {
    btnGlossary.addEventListener('click', () => {
      renderGlossary(glossaryData);
      glossaryModal.classList.remove('hidden');
    });

    btnJournal.addEventListener('click', () => {
      renderJournal();
      journalModal.classList.remove('hidden');
    });

    btnSettings.addEventListener('click', () => {
      const savedKey = localStorage.getItem('zarathustra_gemini_key') || '';
      apiKeyInput.value = savedKey;
      settingsModal.classList.remove('hidden');
      checkApiStatus();
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        document.getElementById(modalId).classList.add('hidden');
      });
    });

    [glossaryModal, journalModal, settingsModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });

    glossarySearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = glossaryData.filter(item => 
        item.term.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) || 
        item.category.toLowerCase().includes(q)
      );
      renderGlossary(filtered);
    });

    btnExportJournal.addEventListener('click', async () => {
      let items = [];
      try {
        const resp = await fetch('/api/journal');
        if (resp.ok) items = await resp.json();
      } catch (e) {
        items = JSON.parse(localStorage.getItem('zarathustra_journal') || '[]');
      }

      if (!items.length) return showToast('لا توجد عناصر للتصدير', 'error');

      let mdContent = `# دفتر قراءة وتحليلات كتاب هكذا تكلم زرادشت\n\nتاريخ التصدير: ${new Date().toLocaleString('ar-IQ')}\n\n---\n\n`;
      items.forEach((item, idx) => {
        mdContent += `## ${idx + 1}. مقتطف (${item.created_at || item.date || ''})\n\n> ${item.quote}\n\n### التحليل والتفكيك:\n${item.analysis}\n\n---\n\n`;
      });

      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zarathustra-journal-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('تم تصدير دفتر القراءة بنجاح!', 'success');
    });

    btnClearJournal.addEventListener('click', async () => {
      if (confirm('هل أنت متأكد من مسح جميع التحليلات المحفوظة؟')) {
        localStorage.removeItem('zarathustra_journal');
        renderJournal();
        refreshJournalFromDb();
        showToast('تم مسح السجل', 'info');
      }
    });

    btnToggleKeyVisibility.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        btnToggleKeyVisibility.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
      } else {
        apiKeyInput.type = 'password';
        btnToggleKeyVisibility.innerHTML = '<i class="fa-solid fa-eye"></i>';
      }
    });

    btnSaveSettings.addEventListener('click', async () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        localStorage.setItem('zarathustra_gemini_key', key);
        try {
          await fetch('/api/set-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: key })
          });
        } catch (e) {}
      }
      showToast('تم حفظ الإعدادات بنجاح', 'success');
      settingsModal.classList.add('hidden');
      checkApiStatus();
    });
  }

  async function loadGlossary() {
    try {
      const resp = await fetch('/api/glossary');
      glossaryData = await resp.json();
    } catch (e) {
      console.warn('Could not load glossary:', e);
    }
  }

  function renderGlossary(items) {
    if (!items || items.length === 0) {
      glossaryList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">لم يتم العثور على مصطلحات مطابقة للبحث</p>';
      return;
    }

    glossaryList.innerHTML = items.map(item => `
      <div class="glossary-card">
        <div class="glossary-card-header">
          <span class="glossary-term">${item.term}</span>
          <span class="glossary-category">${item.category}</span>
        </div>
        <p class="glossary-desc">${item.description}</p>
      </div>
    `).join('');
  }

  async function checkApiStatus() {
    try {
      const resp = await fetch('/api/status');
      const data = await resp.json();
      const localKey = localStorage.getItem('zarathustra_gemini_key');

      if (data.hasApiKey || localKey) {
        apiStatusBadge.className = 'settings-status';
        apiStatusBadge.innerHTML = `
          <div>
            <i class="fa-solid fa-circle-check"></i>
            <strong>المحرك متصل: Gemini 3.7 Flash</strong>
            <br><small style="color:var(--text-muted);">المصادقة: <b>${data.authMethod}</b></small>
            <br><small style="color:var(--gold-300);">🗄️ قاعدة البيانات: <b>${data.database.databaseType}</b></small>
          </div>
        `;
      } else {
        apiStatusBadge.className = 'settings-status error';
        apiStatusBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i><span>يرجى إضافة مفتاح Google Service Account في Vercel</span>';
      }
    } catch (e) {
      apiStatusBadge.className = 'settings-status error';
      apiStatusBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i><span>تعذر الاتصال بالسيرفر</span>';
    }
  }

});
