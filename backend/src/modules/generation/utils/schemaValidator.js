const { HttpError } = require('./httpErrors');

function cloneDefault(value) {
  if (Array.isArray(value)) {
    return value.map(item => cloneDefault(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneDefault(nestedValue)])
    );
  }
  return value;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function coerceScalar(value, type, path) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (type === 'string') {
    return typeof value === 'string' ? value : String(value);
  }

  if (type === 'integer') {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(numberValue)) {
      throw new HttpError(400, `${path} 必须为整数`);
    }
    return numberValue;
  }

  if (type === 'number') {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numberValue)) {
      throw new HttpError(400, `${path} 必须为数字`);
    }
    return numberValue;
  }

  if (type === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === 'true' || value === '1' || value === 1) {
      return true;
    }
    if (value === 'false' || value === '0' || value === 0) {
      return false;
    }
    throw new HttpError(400, `${path} 必须为布尔值`);
  }

  return value;
}

function validateBySchema(schema, rawValue, path) {
  if (!schema) {
    return rawValue;
  }

  if (rawValue === undefined && schema.default !== undefined) {
    rawValue = cloneDefault(schema.default);
  }

  if (schema.type === 'object') {
    const objectValue = rawValue ?? {};
    if (!isPlainObject(objectValue)) {
      throw new HttpError(400, `${path} 必须为对象`);
    }

    const output = {};
    const properties = schema.properties || {};
    const required = schema.required || [];

    for (const key of required) {
      const candidate = objectValue[key];
      if (candidate === undefined || candidate === null || candidate === '') {
        throw new HttpError(400, `${path}.${key} 不能为空`);
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      const childValue = objectValue[key];
      const childPath = path === '$' ? key : `${path}.${key}`;
      const validatedChild = validateBySchema(childSchema, childValue, childPath);
      if (validatedChild !== undefined) {
        output[key] = validatedChild;
      }
    }

    if (schema.additionalProperties !== false) {
      for (const [key, value] of Object.entries(objectValue)) {
        if (!(key in properties)) {
          output[key] = value;
        }
      }
    }

    return output;
  }

  if (schema.type === 'array') {
    if (rawValue === undefined || rawValue === null) {
      return rawValue;
    }
    if (!Array.isArray(rawValue)) {
      throw new HttpError(400, `${path} 必须为数组`);
    }
    return rawValue.map((item, index) =>
      validateBySchema(schema.items || {}, item, `${path}[${index}]`)
    );
  }

  let value = rawValue;
  if (schema.type) {
    value = coerceScalar(value, schema.type, path);
  }

  if (value === undefined || value === null) {
    return value;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    throw new HttpError(400, `${path} 的取值非法`);
  }

  if (schema.minLength !== undefined && String(value).length < schema.minLength) {
    throw new HttpError(400, `${path} 长度不足`);
  }

  if (schema.minimum !== undefined && Number(value) < schema.minimum) {
    throw new HttpError(400, `${path} 不能小于 ${schema.minimum}`);
  }

  return value;
}

function validateRequestSchema(schema, rawInput = {}) {
  return validateBySchema(schema, rawInput, '$');
}

module.exports = {
  validateRequestSchema
};
