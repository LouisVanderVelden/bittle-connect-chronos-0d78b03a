import { useState, useEffect, useCallback } from 'react';
import { serialManager, SerialLog } from '@/lib/serial';

export function useSerial() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<SerialLog[]>([]);

  useEffect(() => {
    const unsubscribe = serialManager.onLog((log) => {
      setLogs(prev => [...prev.slice(-500), log]); // Keep last 500 logs
    });

    return unsubscribe;
  }, []);

  const connect = useCallback(async () => {
    const success = await serialManager.connect();
    setIsConnected(success);
    return success;
  }, []);

  const disconnect = useCallback(async () => {
    await serialManager.disconnect();
    setIsConnected(false);
  }, []);

  const sendSkill = useCallback(async (skill: string) => {
    await serialManager.sendSkill(skill);
  }, []);

  const sendDigitalWrite = useCallback(async (port: number, value: 0 | 1) => {
    await serialManager.sendDigitalWrite(port, value);
  }, []);

  const sendRawCommand = useCallback(async (command: string) => {
    await serialManager.sendRawCommand(command);
  }, []);

  const forceStopMotor = useCallback(async (port: number = 9) => {
    await serialManager.forceStopMotor(port);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    isConnected,
    logs,
    connect,
    disconnect,
    sendSkill,
    sendDigitalWrite,
    sendRawCommand,
    forceStopMotor,
    clearLogs,
  };
}
