class QrService {
  static DEFAULT_URL = 'http://localhost:8080/api/v1/analyze-qr';

  constructor(apiUrl) {
    this.apiUrl = apiUrl || QrService.DEFAULT_URL;
  }

  async analyzeUrl(url) {
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error(`QrService ${res.status}`);
    return res.json();
  }
}
