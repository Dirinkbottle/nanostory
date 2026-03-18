function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function readPath(source, path) {
  if (!source || !path) return undefined;
  const normalized = path.replace(/\[(\d+)\]/g, '.$1');
  return normalized.split('.').reduce((current, key) => {
    if (current === null || current === undefined || key === '') return undefined;
    return current[key];
  }, source);
}

function shouldIgnoreUrlPath(path) {
  if (!path) return false;
  return path.includes('.request.') || path.startsWith('request.') || path.includes('.headers.') || path.startsWith('headers.');
}

function collectUrlCandidates(value, path = '', acc = []) {
  if (acc.length >= 20 || value === null || value === undefined) {
    return acc;
  }

  if (isHttpUrl(value)) {
    if (!shouldIgnoreUrlPath(path)) {
      acc.push({
        path: path || '(root)',
        url: value
      });
    }
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUrlCandidates(item, path ? `${path}[${index}]` : `[${index}]`, acc));
    return acc;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      const nextPath = path ? `${path}.${key}` : key;
      collectUrlCandidates(item, nextPath, acc);
    });
  }

  return acc;
}

function buildDirectPaths(mediaType) {
  const standardKey = `${mediaType}_url`;
  const camelKey = `${mediaType}Url`;
  return [
    standardKey,
    camelKey,
    'url',
    `data.${standardKey}`,
    `data.${camelKey}`,
    'data.url',
    `data.${mediaType}s[0].url`,
    `data.${mediaType}s[0].${standardKey}`,
    `data.${standardKey}s[0]`,
    'data.urls[0]',
    `${mediaType}s[0].url`,
    `${mediaType}s[0].${standardKey}`,
    `${standardKey}s[0]`,
    'urls[0]',
    `result.${standardKey}`,
    `result.${camelKey}`,
    'result.url',
    `output.${standardKey}`,
    `output.${camelKey}`,
    'output.url'
  ];
}

function resolveMediaUrl(result, mediaType) {
  const sources = [
    ['result', result],
    ['result._rawQueryResult', result?._rawQueryResult],
    ['result._queryResult', result?._queryResult],
    ['result._submitResult._raw', result?._submitResult?._raw],
    ['result._submitResult', result?._submitResult]
  ];

  const directPaths = buildDirectPaths(mediaType);

  for (const [label, source] of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const path of directPaths) {
      const value = readPath(source, path);
      if (isHttpUrl(value)) {
        return {
          mediaUrl: value,
          resolvedFrom: `${label}.${path}`,
          candidates: collectUrlCandidates(source)
        };
      }
    }
  }

  for (const [label, source] of sources) {
    if (!source || typeof source !== 'object') continue;
    const candidates = collectUrlCandidates(source);
    if (candidates.length > 0) {
      return {
        mediaUrl: candidates[0].url,
        resolvedFrom: `${label}.${candidates[0].path}`,
        candidates
      };
    }
  }

  return {
    mediaUrl: null,
    resolvedFrom: null,
    candidates: collectUrlCandidates(result)
  };
}

module.exports = {
  resolveMediaUrl
};
