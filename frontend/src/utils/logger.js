class Logger {
  static loggers = [];

  constructor(name, isEnabled = true) {
    this.name = name;
    this.isEnabled = isEnabled;
    Logger.loggers.push(this);
  }

  log(...args) {
    if (this.isEnabled) {
      console.log(`[${this.name} LOG]`, ...args);
    }
  }

  info(...args) {
    if (this.isEnabled) {
      console.info(`[${this.name} INFO]`, ...args);
    }
  }

  warn(...args) {
    if (this.isEnabled) {
      console.warn(`[${this.name} WARN]`, ...args);
    }
  }

  error(...args) {
    if (this.isEnabled) {
      console.error(`[${this.name} ERROR]`, ...args);
    }
  }

  setEnabled(isEnabled) {
    this.isEnabled = isEnabled;
  }

  static setAllEnabled(isEnabled) {
    Logger.loggers.forEach(logger => logger.setEnabled(isEnabled));
  }
}

export default Logger;