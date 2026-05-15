(function () {
  const currentHost = location.hostname.replace(/^www\./, '');

  const RISK_COLORS = {
    LOW: 'linear-gradient(135deg, #16a34a, #064e3b)',
    MEDIUM: 'linear-gradient(135deg, #ca8a04, #713f12)',
    HIGH: 'linear-gradient(135deg, #dc2626, #450a0a)',
    CRITICAL: 'linear-gradient(135deg, #111827, #000000)',
    UNKNOWN: 'linear-gradient(135deg, #475569, #0f172a)',
  };

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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
})();
