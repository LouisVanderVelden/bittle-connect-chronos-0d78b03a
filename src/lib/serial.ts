// Web Serial API utilities for Bittle robot communication

// Type declarations for Web Serial API
declare global {
  interface Navigator {
    serial: {
      requestPort(): Promise<SerialPort>;
    };
  }

  interface SerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
  }
}

export interface SerialLog {
  timestamp: Date;
  type: 'tx' | 'rx' | 'info' | 'error';
  message: string;
}

type LogCallback = (log: SerialLog) => void;

class SerialManager {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private logCallbacks: LogCallback[] = [];
  private isReading = false;
  private commandQueue: (() => Promise<void>)[] = [];
  private isProcessingQueue = false;

  get isConnected(): boolean {
    return this.port !== null && this.writer !== null;
  }

  onLog(callback: LogCallback) {
    this.logCallbacks.push(callback);
    return () => {
      this.logCallbacks = this.logCallbacks.filter(cb => cb !== callback);
    };
  }

  private log(type: SerialLog['type'], message: string) {
    const logEntry: SerialLog = {
      timestamp: new Date(),
      type,
      message,
    };
    this.logCallbacks.forEach(cb => cb(logEntry));
  }

  async connect(): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        this.log('error', 'Web Serial API not supported in this browser');
        return false;
      }

      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });

      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }

      if (this.port.readable) {
        this.reader = this.port.readable.getReader();
        this.startReading();
      }

      this.log('info', 'Connected to Bittle at 115200 baud');
      return true;
    } catch (error) {
      this.log('error', `Connection failed: ${error}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isReading = false;

    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }

      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.log('info', 'Disconnected from Bittle');
    } catch (error) {
      this.log('error', `Disconnect error: ${error}`);
    }
  }

  private async startReading() {
    if (!this.reader) return;
    this.isReading = true;

    const decoder = new TextDecoder();

    try {
      while (this.isReading && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          const text = decoder.decode(value);
          this.log('rx', text.trim());
        }
      }
    } catch (error) {
      if (this.isReading) {
        this.log('error', `Read error: ${error}`);
      }
    }
  }

  private async executeCommand(command: () => Promise<void>) {
    return new Promise<void>((resolve) => {
      this.commandQueue.push(async () => {
        await command();
        resolve();
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.commandQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      if (command) {
        await command();
        // Small delay between commands to prevent overlap
        await new Promise(r => setTimeout(r, 50));
      }
    }

    this.isProcessingQueue = false;
  }

  async sendDigitalWrite(port: number, value: 0 | 1): Promise<void> {
    return this.executeCommand(async () => {
      if (!this.isConnected || !this.writer) {
        this.log('error', 'Not connected - Command skipped');
        return;
      }

      if (port < 0 || port > 99) {
        this.log('error', `Invalid port: ${port}. Must be 0-99`);
        return;
      }

      // Create the command: "Wd" as ASCII + port as 1-byte + value as 1-byte
      const encoder = new TextEncoder();
      const wdBytes = encoder.encode('Wd');
      const data = new Uint8Array(4);
      data[0] = wdBytes[0]; // 'W'
      data[1] = wdBytes[1]; // 'd'
      data[2] = port;       // port as raw byte
      data[3] = value;      // value as raw byte

      try {
        await this.writer.write(data);
        this.log('tx', `[${new Date().toISOString()}] DigitalWrite: Port ${port} = ${value}`);
      } catch (error) {
        this.log('error', `Failed to send DigitalWrite: ${error}`);
      }
    });
  }

  async sendSkill(skill: string): Promise<void> {
    return this.executeCommand(async () => {
      if (!this.isConnected || !this.writer) {
        this.log('error', 'Not connected - Command skipped');
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(skill + '\n');

      try {
        await this.writer.write(data);
        this.log('tx', `[${new Date().toISOString()}] Skill: ${skill}`);
      } catch (error) {
        this.log('error', `Failed to send skill: ${error}`);
      }
    });
  }

  async sendRawCommand(command: string): Promise<void> {
    return this.executeCommand(async () => {
      if (!this.isConnected || !this.writer) {
        this.log('error', 'Not connected - Command skipped');
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(command + '\n');

      try {
        await this.writer.write(data);
        this.log('tx', `[${new Date().toISOString()}] Raw: ${command}`);
      } catch (error) {
        this.log('error', `Failed to send command: ${error}`);
      }
    });
  }
}

export const serialManager = new SerialManager();

export const SKILL_OPTIONS = [
  'kup', 'ksit', 'kstr', 'kpu', 'kchr', 'khi', 'kcmh', 'kck', 'kvtF', 'kvtLX',
  'kcrF', 'kwkF', 'kbk', 'kphF', 'kkc', 'kpd', 'kpee', 'khg', 'khu', 'khds',
  'krc', 'kscrh', 'kdg', 'ksnf', 'kwh', 'knd', 'kfiv', 'kbf', 'kff', 'khsk',
  'kgdb', 'ktbl', 'kbx', 'kjmp', 'kclup', 'klpov', 'kang', 'kx'
];
