const { OUTPUT_FORMATS, ERROR_CODES } = require('./constants');
const { AppError } = require('./errors');

function toDisplayValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function toTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'No rows.';
  }

  const normalizedRows = rows.map((row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      return row;
    }
    return { value: row };
  });

  const columns = Array.from(
    normalizedRows.reduce((set, row) => {
      for (const key of Object.keys(row)) {
        set.add(key);
      }
      return set;
    }, new Set())
  );

  const widths = columns.map((column) =>
    Math.max(column.length, ...normalizedRows.map((row) => toDisplayValue(row[column]).length))
  );

  const header = columns
    .map((column, index) => column.padEnd(widths[index], ' '))
    .join(' | ');
  const separator = widths.map((width) => '-'.repeat(width)).join('-|-');
  const body = normalizedRows
    .map((row) =>
      columns
        .map((column, index) => toDisplayValue(row[column]).padEnd(widths[index], ' '))
        .join(' | ')
    )
    .join('\n');

  return `${header}\n${separator}\n${body}`;
}

function printResult(result, outputFormat) {
  if (!OUTPUT_FORMATS.includes(outputFormat)) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      `Invalid output format "${outputFormat}". Allowed values: ${OUTPUT_FORMATS.join(', ')}.`
    );
  }

  if (outputFormat === 'table') {
    if (result && Array.isArray(result.tableRows)) {
      console.log(toTable(result.tableRows));
      return;
    }
    if (Array.isArray(result)) {
      console.log(toTable(result));
      return;
    }
  }

  const payload = result && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result;
  console.log(JSON.stringify(payload, null, 2));
}

function printError(error) {
  const payload = {
    ok: false,
    error: {
      code: error.code,
      message: error.message
    }
  };
  if (error.status !== undefined) {
    payload.error.status = error.status;
  }
  if (error.details !== undefined) {
    payload.error.details = error.details;
  }
  console.error(JSON.stringify(payload, null, 2));
}

module.exports = {
  printResult,
  printError,
  toTable
};
