class ScamDetectionService {
  static DEFAULT_URL = 'http://localhost:8080/api/v1/analyze';

  constructor(apiUrl) {
    this.apiUrl = apiUrl || ScamDetectionService.DEFAULT_URL;
  }

  async analyze(text) {
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`ScamDetectionService ${res.status}`);
    return res.json();
  }
}
