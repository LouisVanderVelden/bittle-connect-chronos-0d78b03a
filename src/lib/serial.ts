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

// Helper to format timestamp for logs
function formatTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

// Sleep helper with milliseconds
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

      this.log('info', `${formatTime()} - Connected to Bittle at 115200 baud`);
      return true;
    } catch (error) {
      this.log('error', `${formatTime()} - Connection failed: ${error}`);
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

      this.log('info', `${formatTime()} - Disconnected from Bittle`);
    } catch (error) {
      this.log('error', `${formatTime()} - Disconnect error: ${error}`);
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
        this.log('error', `${formatTime()} - Read error: ${error}`);
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
        // Delay between commands to ensure buffer is clear
        await delay(50);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Send Digital Write command with robust timing
   * Sends: [87='W', 100='d', port, value] as 4-byte Uint8Array
   */
  async sendDigitalWrite(port: number, value: 0 | 1): Promise<void> {
    return this.executeCommand(async () => {
      if (!this.isConnected || !this.writer) {
        this.log('error', `${formatTime()} - Not connected - DigitalWrite skipped`);
        return;
      }

      if (port < 0 || port > 99) {
        this.log('error', `${formatTime()} - Invalid port: ${port}. Must be 0-99`);
        return;
      }

      // Create the command: [87='W', 100='d', port, value]
      const data = new Uint8Array([87, 100, port, value]);

      try {
        // Pre-write delay to ensure buffer is ready
        await delay(50);
        
        await this.writer.write(data);
        
        // Post-write delay to let hardware process
        await delay(50);
        
        const state = value === 1 ? 'HIGH' : 'LOW';
        this.log('tx', `${formatTime()} - Motor ${port} ${state}`);
      } catch (error) {
        this.log('error', `${formatTime()} - Failed to send DigitalWrite: ${error}`);
      }
    });
  }

  /**
   * Force stop motor - immediate command without queue (for emergencies)
   */
  async forceStopMotor(port: number = 9): Promise<void> {
    if (!this.isConnected || !this.writer) {
      this.log('error', `${formatTime()} - Not connected - Force stop skipped`);
      return;
    }

    const data = new Uint8Array([87, 100, port, 0]);

    try {
      await delay(50);
      await this.writer.write(data);
      await delay(50);
      this.log('tx', `${formatTime()} - FORCE STOP Motor ${port}`);
    } catch (error) {
      this.log('error', `${formatTime()} - Failed to force stop motor: ${error}`);
    }
  }

  async sendSkill(skill: string): Promise<void> {
    return this.executeCommand(async () => {
      if (!this.isConnected || !this.writer) {
        this.log('error', `${formatTime()} - Not connected - Skill skipped`);
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(skill + '\n');

      try {
        await delay(50);
        await this.writer.write(data);
        await delay(50);
        this.log('tx', `${formatTime()} - Sending Skill: ${skill}`);
      } catch (error) {
        this.log('error', `${formatTime()} - Failed to send skill: ${error}`);
      }
    });
  }

  async sendRawCommand(command: string): Promise<void> {
    return this.executeCommand(async () => {
      if (!this.isConnected || !this.writer) {
        this.log('error', `${formatTime()} - Not connected - Command skipped`);
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(command + '\n');

      try {
        await delay(50);
        await this.writer.write(data);
        await delay(50);
        this.log('tx', `${formatTime()} - Raw command: ${command}`);
      } catch (error) {
        this.log('error', `${formatTime()} - Failed to send command: ${error}`);
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
