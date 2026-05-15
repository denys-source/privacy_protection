const PII_REGEXES = [
  {
    type: 'EMAIL',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
  },
  { type: 'CARD', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
  { type: 'SSN', pattern: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g },
  {
    type: 'PHONE',
    pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g,
  },
  { type: 'IPV6', pattern: /([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g },
  {
    type: 'IPV4',
    pattern:
      /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  },
];

const NLP_EXTRACTORS = [
  { match: (doc) => doc.people(), type: 'PERSON' },
  { match: (doc) => doc.places(), type: 'PLACE' },
  { match: (doc) => doc.match('#Date'), type: 'DATE' },
];

function collectRegexMatches(text) {
  const matches = [];
  for (const { type, pattern } of PII_REGEXES) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        type,
        original: m[0],
      });
    }
  }
  return matches;
}

function collectNlpMatches(text) {
  const matches = [];
  const doc = nlp(text);

  for (const { match, type } of NLP_EXTRACTORS) {
    const offsets = match(doc).out('offset');
    for (const o of offsets) {
      const start = o.offset.start;
      const raw = text.slice(start, start + o.offset.length);
      const trimmed = raw.replace(/[\s.,;:!?]+$/, '');
      if (!trimmed || trimmed.length < 2) continue;
      matches.push({
        start,
        end: start + trimmed.length,
        type,
        original: trimmed,
      });
    }
  }

  return matches;
}

function removeOverlaps(matches) {
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const result = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      result.push(m);
      lastEnd = m.end;
    }
  }
  return result;
}

function redactPII(text, sessionMap) {
  const counters = {};

  function placeholder(type, original) {
    if (sessionMap.has(original)) return sessionMap.get(original);
    counters[type] = (counters[type] || 0) + 1;
    const ph = `[${type}_${counters[type]}]`;
    sessionMap.set(original, ph);
    return ph;
  }

  const matches = removeOverlaps([
    ...collectRegexMatches(text),
    ...collectNlpMatches(text),
  ]);

  let result = '';
  let cursor = 0;
  for (const m of matches) {
    result += text.slice(cursor, m.start);
    result += placeholder(m.type, m.original);
    cursor = m.end;
  }
  result += text.slice(cursor);

  return { redactedText: result, count: matches.length };
}
