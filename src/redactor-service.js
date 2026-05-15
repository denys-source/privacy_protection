class RedactorService {
  static DEFAULT_URL = 'http://localhost:8080/api/v1/redact';

  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async redact(text) {
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Redact API ${res.status}`);
    const { redacted_text } = await res.json();
    return redacted_text;
  }
}
