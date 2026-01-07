import { useState, useEffect } from 'react';
import { Settings, Terminal, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSettings, saveSettings, Settings as SettingsType } from '@/lib/storage';
import { SKILL_OPTIONS, SerialLog } from '@/lib/serial';

interface SettingsTabProps {
  logs: SerialLog[];
  clearLogs: () => void;
  sendRawCommand: (command: string) => Promise<void>;
  sendDigitalWrite: (port: number, value: 0 | 1) => Promise<void>;
  isConnected: boolean;
}

export function SettingsTab({ logs, clearLogs, sendRawCommand, sendDigitalWrite, isConnected }: SettingsTabProps) {
  const [settings, setSettings] = useState<SettingsType>(getSettings());
  const [manualCommand, setManualCommand] = useState('');
  const [digitalPort, setDigitalPort] = useState('9');
  const [digitalValue, setDigitalValue] = useState<'0' | '1'>('1');

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleSendManual = async () => {
    if (!manualCommand) return;
    await sendRawCommand(manualCommand);
    setManualCommand('');
  };

  const handleDigitalWrite = async () => {
    const port = parseInt(digitalPort, 10);
    if (isNaN(port) || port < 0 || port > 99) return;
    await sendDigitalWrite(port, parseInt(digitalValue, 10) as 0 | 1);
  };

  return (
    <div className="space-y-6">
      {/* Skill Settings */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-primary" />
            Skill Settings
          </CardTitle>
          <CardDescription>
            Configure which skills Bittle performs for each event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Task Creation */}
          <div className="space-y-2">
            <Label>Task Creation Skill</Label>
            <Select 
              value={settings.taskCreationSkill} 
              onValueChange={(v) => setSettings(s => ({ ...s, taskCreationSkill: v }))}
            >
              <SelectTrigger className="bg-input/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-60">
                {SKILL_OPTIONS.map(skill => (
                  <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Overdue */}
          <div className="space-y-2">
            <Label>Overdue Task Skill</Label>
            <Select 
              value={settings.overdueSkill} 
              onValueChange={(v) => setSettings(s => ({ ...s, overdueSkill: v }))}
            >
              <SelectTrigger className="bg-input/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-60">
                {SKILL_OPTIONS.map(skill => (
                  <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Done Reward Sequence */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-success" />
              Done Reward Sequence
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Skill #1</Label>
                <Select 
                  value={settings.doneSkill1} 
                  onValueChange={(v) => setSettings(s => ({ ...s, doneSkill1: v }))}
                >
                  <SelectTrigger className="bg-input/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-60">
                    {SKILL_OPTIONS.map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Motor Duration #1 (sec)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.doneDuration1}
                  onChange={(e) => setSettings(s => ({ ...s, doneDuration1: parseInt(e.target.value) || 10 }))}
                  className="bg-input/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Skill #2</Label>
                <Select 
                  value={settings.doneSkill2} 
                  onValueChange={(v) => setSettings(s => ({ ...s, doneSkill2: v }))}
                >
                  <SelectTrigger className="bg-input/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-60">
                    {SKILL_OPTIONS.map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Motor Duration #2 (sec)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.doneDuration2}
                  onChange={(e) => setSettings(s => ({ ...s, doneDuration2: parseInt(e.target.value) || 10 }))}
                  className="bg-input/50"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Command */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Terminal className="h-6 w-6 text-terminal-text" />
            Manual Command
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter command..."
              value={manualCommand}
              onChange={(e) => setManualCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendManual()}
              className="bg-input/50 font-mono"
            />
            <Button onClick={handleSendManual} disabled={!isConnected}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2 items-end">
            <div className="space-y-2 flex-1">
              <Label>Digital Write Port (0-99)</Label>
              <Input
                type="number"
                min={0}
                max={99}
                value={digitalPort}
                onChange={(e) => setDigitalPort(e.target.value)}
                className="bg-input/50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Select value={digitalValue} onValueChange={(v) => setDigitalValue(v as '0' | '1')}>
                <SelectTrigger className="bg-input/50 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDigitalWrite} disabled={!isConnected} variant="secondary">
              Write
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Serial Monitor */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Terminal className="h-6 w-6 text-terminal-text" />
            Serial Monitor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </CardHeader>
        <CardContent>
          <div className="terminal-log rounded-lg p-4 h-64 overflow-y-auto scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">No logs yet...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`${
                  log.type === 'tx' ? 'terminal-tx' : 
                  log.type === 'rx' ? 'terminal-rx' : 
                  log.type === 'error' ? 'text-destructive' : 
                  'text-muted-foreground'
                }`}>
                  <span className="opacity-60">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>{' '}
                  <span className="font-semibold">
                    {log.type.toUpperCase()}:
                  </span>{' '}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
