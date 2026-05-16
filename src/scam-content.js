(function () {
  const currentHost = location.hostname.replace(/^www\./, '');

  const RISK_COLORS = {
    LOW: 'linear-gradient(135deg, #16a34a, #064e3b)',
    MEDIUM: 'linear-gradient(135deg, #ca8a04, #713f12)',
    HIGH: 'linear-gradient(135deg, #dc2626, #450a0a)',
    CRITICAL: 'linear-gradient(135deg, #111827, #000000)',
    UNKNOWN: 'linear-gradient(135deg, #475569, #0f172a)',
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showWarning(data) {
    const existing = document.querySelector('.scamlens-warning');
    if (existing) existing.remove();

    const score = Math.max(0, Math.min(100, Number(data.score) || 0));
    const risk = String(data.risk || 'UNKNOWN').toUpperCase();

    const box = document.createElement('div');
    box.className = 'scamlens-warning';
    box.style.background = RISK_COLORS[risk] || RISK_COLORS.UNKNOWN;

    const actionsHtml = data.actions?.length
      ? `<h4>Recommended Actions:</h4><ul>${data.actions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
      : '';

    box.innerHTML = `
      <button class="scamlens-close">✖</button>
      <h2>⚠ ${escapeHtml(risk)}</h2>
      <p>Scam Probability: ${score}%</p>
      <p>${escapeHtml(data.reason || '')}</p>
      ${actionsHtml}
    `;

    document.body.appendChild(box);
    box.querySelector('.scamlens-close').addEventListener('click', () => box.remove());
  }

  function showQRResult(data) {
    const old = document.querySelector('.scamlens-qr');
    if (old) old.remove();

    const risk = String(data.risk || 'UNKNOWN').toUpperCase();
    const score = Math.max(0, Math.min(100, Number(data.score) || 0));

    const box = document.createElement('div');
    box.className = 'scamlens-qr';
    box.style.background = RISK_COLORS[risk] || RISK_COLORS.UNKNOWN;

    const qrDataHtml = data.qrData
      ? `<div class="scamlens-qr-data"><strong>QR Content:</strong><pre>${escapeHtml(data.qrData)}</pre></div>`
      : '';

    const actionsHtml = data.url && /^https?:\/\//i.test(data.url)
      ? `<div class="scamlens-qr-actions">
           <button id="scamlens-open-qr">Open link</button>
           <button id="scamlens-stay">Stay here</button>
         </div>`
      : '';

    box.innerHTML = `
      <button class="scamlens-close">✖</button>
      <h2>QR Scan Result</h2>
      <p><strong>Risk:</strong> ${escapeHtml(risk)}</p>
      <p><strong>Score:</strong> ${score}%</p>
      <p>${escapeHtml(data.reason || '')}</p>
      ${qrDataHtml}
      ${actionsHtml}
    `;

    document.body.appendChild(box);
    box.querySelector('.scamlens-close').addEventListener('click', () => box.remove());

    const openBtn = box.querySelector('#scamlens-open-qr');
    if (openBtn) openBtn.addEventListener('click', () => window.open(data.url, '_blank'));

    const stayBtn = box.querySelector('#scamlens-stay');
    if (stayBtn) stayBtn.addEventListener('click', () => box.remove());
  }

  function readQRFromImage(img) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      image.crossOrigin = 'Anonymous';
      image.onload = () => {
        try {
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          ctx.drawImage(image, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height);
          resolve(qr ? qr.data : null);
        } catch (err) {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = img.src;
    });
  }

  async function scanQRCodes(service) {
    const images = Array.from(document.images);
    for (const img of images) {
      try {
        const qrText = await readQRFromImage(img);
        if (qrText && qrText.trim().length > 0) {
          const isUrl = /^https?:\/\//i.test(qrText);
          if (!isUrl) {
            showQRResult({
              risk: 'LOW',
              score: 0,
              url: '',
              qrData: qrText,
              reason: 'QR code detected. This QR does not contain a website link.',
            });
            return;
          }
          const data = await service.analyzeUrl(qrText);
          showQRResult(data);
          return;
        }
      } catch (err) {
        console.error('[ScamLens] QR scan error:', err);
      }
    }
    showQRResult({ risk: 'LOW', score: 0, url: '', reason: 'No QR codes found on this page.' });
  }

  function analyzePage(service) {
    setTimeout(() => {
      const pageText = (document.body?.innerText || '').trim().slice(0, 1000);
      if (pageText.length < 30) return;
      service.analyze(pageText)
        .then(showWarning)
        .catch(err => console.error('[ScamLens]', err));
    }, 3000);
  }

  chrome.storage.local.get({ scamEnabled: true, scamApiUrl: ScamDetectionService.DEFAULT_URL }, ({ scamEnabled, scamApiUrl }) => {
    if (!scamEnabled) return;

    chrome.storage.sync.get(['ignoredSites'], ({ ignoredSites = [] }) => {
      const isIgnored = ignoredSites.some(
        site => currentHost === site || currentHost.endsWith('.' + site)
      );
      if (isIgnored) return;

      analyzePage(new ScamDetectionService(scamApiUrl));
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.scamEnabled?.newValue === false) {
      document.querySelector('.scamlens-warning')?.remove();
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'SCAN_QR_CODES') {
      chrome.storage.local.get({ qrApiUrl: QrService.DEFAULT_URL }, ({ qrApiUrl }) => {
        scanQRCodes(new QrService(qrApiUrl));
      });
      sendResponse({ status: 'QR scan started' });
    }
    return true;
  });
})();
