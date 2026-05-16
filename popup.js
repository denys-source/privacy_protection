document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
  }));

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

  const scamToggle = document.getElementById('scamEnabledToggle');
  const scamUrlInput = document.getElementById('scamApiUrl');
  const scamSaveBtn = document.getElementById('scamSaveBtn');
  const scamStatus = document.getElementById('scamStatus');
  const scamSiteInput = document.getElementById('scamSiteInput');
  const scamAddBtn = document.getElementById('scamAddBtn');
  const scamError = document.getElementById('scamError');
  const scamSiteList = document.getElementById('scamSiteList');

  chrome.storage.local.get(
    { scamEnabled: true, scamApiUrl: ScamDetectionService.DEFAULT_URL },
    ({ scamEnabled, scamApiUrl }) => {
      scamToggle.checked = scamEnabled;
      scamUrlInput.value = scamApiUrl;
    }
  );

  scamSaveBtn.addEventListener('click', () => {
    const url = scamUrlInput.value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      scamStatus.textContent = 'URL must start with http:// or https://';
      scamStatus.className = 'error';
      return;
    }
    chrome.storage.local.set({ scamEnabled: scamToggle.checked, scamApiUrl: url }, () => {
      scamStatus.textContent = 'Saved';
      scamStatus.className = '';
      setTimeout(() => { scamStatus.textContent = ''; }, 2000);
    });
  });

  function normalizeSite(site) {
    return site.trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }

  function isValidDomain(site) {
    return /^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(site);
  }

  function loadSites() {
    chrome.storage.sync.get(['ignoredSites'], ({ ignoredSites = [] }) => {
      scamSiteList.innerHTML = '';
      if (ignoredSites.length === 0) {
        scamSiteList.innerHTML = '<div class="empty-sites">No ignored websites yet.</div>';
        return;
      }
      ignoredSites.forEach(site => {
        const li = document.createElement('li');
        li.className = 'site-item';
        li.innerHTML = `<span>${site}</span><button class="site-remove" data-site="${site}">✖</button>`;
        scamSiteList.appendChild(li);
      });
      scamSiteList.querySelectorAll('.site-remove').forEach(btn => {
        btn.addEventListener('click', () => removeSite(btn.dataset.site));
      });
    });
  }

  function addSite() {
    scamError.textContent = '';
    const site = normalizeSite(scamSiteInput.value);
    if (!site) { scamError.textContent = 'Enter a website domain.'; return; }
    if (!isValidDomain(site)) { scamError.textContent = 'Invalid domain. Example: example.com'; return; }
    chrome.storage.sync.get(['ignoredSites'], ({ ignoredSites = [] }) => {
      if (ignoredSites.includes(site)) { scamError.textContent = 'Already ignored.'; return; }
      ignoredSites.push(site);
      chrome.storage.sync.set({ ignoredSites }, () => { scamSiteInput.value = ''; loadSites(); });
    });
  }

  function removeSite(site) {
    chrome.storage.sync.get(['ignoredSites'], ({ ignoredSites = [] }) => {
      chrome.storage.sync.set({ ignoredSites: ignoredSites.filter(s => s !== site) }, loadSites);
    });
  }

  scamAddBtn.addEventListener('click', addSite);
  scamSiteInput.addEventListener('keydown', e => { if (e.key === 'Enter') addSite(); });
  loadSites();

  const qrApiUrlInput = document.getElementById('qrApiUrl');
  const qrSaveBtn = document.getElementById('qrSaveBtn');
  const qrStatus = document.getElementById('qrStatus');
  const scanQrBtn = document.getElementById('scanQrBtn');
  const scanQrStatus = document.getElementById('scanQrStatus');

  chrome.storage.local.get({ qrApiUrl: QrService.DEFAULT_URL }, ({ qrApiUrl }) => {
    qrApiUrlInput.value = qrApiUrl;
  });

  qrSaveBtn.addEventListener('click', () => {
    const url = qrApiUrlInput.value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      qrStatus.textContent = 'URL must start with http:// or https://';
      qrStatus.className = 'error';
      return;
    }
    chrome.storage.local.set({ qrApiUrl: url }, () => {
      qrStatus.textContent = 'Saved';
      qrStatus.className = '';
      setTimeout(() => { qrStatus.textContent = ''; }, 2000);
    });
  });

  scanQrBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { action: 'SCAN_QR_CODES' }, () => {
        scanQrStatus.textContent = 'Scanning…';
        setTimeout(() => { scanQrStatus.textContent = ''; }, 2000);
      });
    });
  });
});
