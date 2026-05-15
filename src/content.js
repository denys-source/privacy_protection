(function () {
  let isRedacting = false;
  let enabled = true;
  let service = null;

  function showToast(msg, isError = false) {
    const existing = document.getElementById('pii-redactor-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'pii-redactor-toast';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '10px 16px',
      borderRadius: '8px',
      background: isError ? '#dc2626' : '#16a34a',
      color: '#fff',
      fontSize: '13px',
      zIndex: '2147483647',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      transition: 'opacity 0.3s',
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  chrome.storage.local.get(
    { redactApiUrl: RedactorService.DEFAULT_URL, redactEnabled: true },
    ({ redactApiUrl, redactEnabled }) => {
      enabled = redactEnabled;
      service = new RedactorService(redactApiUrl);
    },
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.redactEnabled !== undefined)
      enabled = changes.redactEnabled.newValue;
    if (changes.redactApiUrl !== undefined)
      service = new RedactorService(changes.redactApiUrl.newValue);
  });

  function getAdapter() {
    return SITE_ADAPTERS[location.hostname] || null;
  }

  function getInputText(el, inputType) {
    return inputType === 'contenteditable' ? el.innerText : el.value;
  }

  function setInputText(el, inputType, text) {
    if (inputType === 'contenteditable') {
      el.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    } else {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA'
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeSetter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function handleSubmit(adapter) {
    if (!service) return;

    const input = document.querySelector(adapter.inputSelector);
    if (!input) return;

    const text = getInputText(input, adapter.inputType);
    if (!text || !text.trim()) return;

    isRedacting = true;
    try {
      const redactedText = await service.redact(text);
      setInputText(input, adapter.inputType, redactedText);
      showToast('PII redacted');
    } catch (err) {
      console.error('[PII Redactor]', err);
      showToast('Redaction failed: ' + err.message, true);
    } finally {
      setTimeout(() => {
        isRedacting = false;
      }, 500);
    }
  }

  async function onKeydown(e) {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    if (!enabled) return;

    const adapter = getAdapter();
    if (!adapter) return;

    const input = document.querySelector(adapter.inputSelector);
    if (!input) return;
    if (!input.contains(e.target) && e.target !== input) return;
    if (isRedacting) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    await handleSubmit(adapter);

    const btn = document.querySelector(adapter.submitSelector);
    if (btn && !btn.disabled) btn.click();
  }

  async function onButtonClick(e) {
    if (!enabled || isRedacting) return;

    const adapter = getAdapter();
    if (!adapter) return;

    const btn = document.querySelector(adapter.submitSelector);
    if (!btn || (!btn.contains(e.target) && e.target !== btn)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    await handleSubmit(adapter);

    if (!btn.disabled) btn.click();
  }

  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('click', onButtonClick, true);
})();
