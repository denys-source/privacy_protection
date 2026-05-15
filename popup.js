document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('enabledToggle');
  const urlInput = document.getElementById('apiUrl');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  chrome.storage.local.get(
    { redactApiUrl: RedactorService.DEFAULT_URL, redactEnabled: true },
    ({ redactApiUrl, redactEnabled }) => {
      urlInput.value = redactApiUrl;
      toggle.checked = redactEnabled;
    }
  );

  saveBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      status.textContent = 'URL must start with http:// or https://';
      status.className = 'error';
      return;
    }
    chrome.storage.local.set({ redactApiUrl: url, redactEnabled: toggle.checked }, () => {
      status.textContent = 'Saved';
      status.className = '';
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  });
});
