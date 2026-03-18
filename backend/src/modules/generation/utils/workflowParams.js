function parseWorkflowInputParams(inputParams) {
  if (!inputParams) {
    return {};
  }

  if (typeof inputParams === 'string') {
    try {
      return JSON.parse(inputParams);
    } catch (error) {
      return {};
    }
  }

  return inputParams;
}

function isNormalizedGenerationCommand(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    value.contractVersion === 1 &&
    value.scope &&
    value.models &&
    value.inputs &&
    value.options
  );
}

function getNormalizedParamValue(inputParams, key) {
  const parsed = parseWorkflowInputParams(inputParams);

  if (parsed[key] !== undefined) {
    return parsed[key];
  }

  if (!isNormalizedGenerationCommand(parsed)) {
    return undefined;
  }

  const candidates = [
    parsed.scope?.[key],
    parsed.models?.[key],
    parsed.inputs?.[key],
    parsed.options?.[key],
    parsed.actor?.[key]
  ];

  return candidates.find(value => value !== undefined);
}

function toCompatWorkflowInputParams(inputParams) {
  const parsed = parseWorkflowInputParams(inputParams);
  if (!isNormalizedGenerationCommand(parsed)) {
    return parsed;
  }

  return {
    ...parsed,
    ...(parsed.actor || {}),
    ...(parsed.scope || {}),
    ...(parsed.models || {}),
    ...(parsed.inputs || {}),
    ...(parsed.options || {})
  };
}

function normalizeWorkflowJobForApi(job) {
  if (!job) {
    return job;
  }

  return {
    ...job,
    input_params: toCompatWorkflowInputParams(job.input_params)
  };
}

module.exports = {
  parseWorkflowInputParams,
  isNormalizedGenerationCommand,
  getNormalizedParamValue,
  toCompatWorkflowInputParams,
  normalizeWorkflowJobForApi
};
