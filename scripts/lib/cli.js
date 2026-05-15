const { resolveConfig } = require('./config');
const { parseGlobalOptions } = require('./args');
const { printResult, printError } = require('./output');
const { toAppError } = require('./errors');
const { OUTPUT_FORMATS, EXIT_CODES } = require('./constants');
const { JiraClient } = require('./jira-client');
const { FieldResolver } = require('./field-resolver');
const { buildHelpText } = require('./help');
const { runCommand } = require('./commands');

async function runCli(argv) {
  try {
    const preParsed = parseGlobalOptions(argv, 'json');
    const requestedHelp =
      preParsed.commandTokens.length === 0 ||
      ['help', '--help', '-h'].includes(preParsed.commandTokens[0]);
    if (requestedHelp) {
      console.log(buildHelpText());
      return EXIT_CODES.SUCCESS;
    }

    const config = resolveConfig();
    const { globalOptions, commandTokens } = parseGlobalOptions(argv, config.defaultOutput);
    if (!OUTPUT_FORMATS.includes(globalOptions.output)) {
      throw new Error(`Invalid --output "${globalOptions.output}". Allowed values: ${OUTPUT_FORMATS.join(', ')}.`);
    }

    const client = new JiraClient(config);
    const fieldResolver = new FieldResolver(client, config);
    const context = {
      config,
      client,
      fieldResolver,
      globalOptions
    };

    const result = await runCommand(commandTokens, context);
    if (result && result.help) {
      console.log(buildHelpText());
      return EXIT_CODES.SUCCESS;
    }

    printResult(result, globalOptions.output);
    return EXIT_CODES.SUCCESS;
  } catch (error) {
    const appError = toAppError(error);
    printError(appError);
    return appError.exitCode || EXIT_CODES.UNKNOWN;
  }
}

module.exports = {
  runCli
};
