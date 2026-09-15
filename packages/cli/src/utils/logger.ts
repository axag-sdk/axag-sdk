import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

const LOG_SYMBOLS: Record<LogLevel, string> = {
  debug: chalk.gray('●'),
  info: chalk.blue('ℹ'),
  warn: chalk.yellow('⚠'),
  error: chalk.red('✖'),
  success: chalk.green('✔'),
};

let verbose = false;

export function setVerbose(v: boolean): void {
  verbose = v;
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (level === 'debug' && !verbose) return;
  const symbol = LOG_SYMBOLS[level];
  console.log(`${symbol} ${message}`, ...args);
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => log('debug', msg, ...args),
  info: (msg: string, ...args: unknown[]) => log('info', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log('warn', msg, ...args),
  error: (msg: string, ...args: unknown[]) => log('error', msg, ...args),
  success: (msg: string, ...args: unknown[]) => log('success', msg, ...args),
  blank: () => console.log(),

  /** Section header with line separator. */
  section: (title: string) => {
    console.log();
    console.log(chalk.bold.underline(title));
    console.log();
  },

  /** Formatted key-value pair. */
  kv: (key: string, value: string | number) => {
    console.log(`  ${chalk.dim(key + ':')} ${value}`);
  },

  /** Indented bullet point. */
  bullet: (text: string, indent = 2) => {
    console.log(`${' '.repeat(indent)}${chalk.dim('•')} ${text}`);
  },
};
