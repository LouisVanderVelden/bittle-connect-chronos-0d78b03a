import { useState } from 'react';
import { Usb, PlusCircle, Clock, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SerialConnectionTab } from '@/components/SerialConnectionTab';
import { CreateTaskTab } from '@/components/CreateTaskTab';
import { TimelineTab } from '@/components/TimelineTab';
import { SettingsTab } from '@/components/SettingsTab';
import { useSerial } from '@/hooks/useSerial';
import { ElephantIcon } from '@/components/ElephantIcon';

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { 
    isConnected, 
    logs, 
    connect, 
    disconnect, 
    sendSkill, 
    sendDigitalWrite, 
    sendRawCommand,
    sendServoCommand,
    forceStopMotor,
    clearLogs 
  } = useSerial();

  const handleTaskCreated = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
                <ElephantIcon size={26} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Bittle Day Planner</h1>
                <p className="text-sm text-muted-foreground">Robot-assisted task management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-success glow-success' : 'bg-muted-foreground'}`} />
              <span className="text-sm font-medium text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="connection" className="space-y-8">
          <TabsList className="grid grid-cols-4 bg-muted/50 p-1.5 rounded-xl">
            <TabsTrigger value="connection" className="gap-2">
              <Usb className="h-4 w-4" />
              <span className="hidden sm:inline">Serial</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Create Task</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="mt-6">
            <SerialConnectionTab 
              isConnected={isConnected}
              onConnect={connect}
              onDisconnect={disconnect}
              onForceStopMotor={forceStopMotor}
            />
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <CreateTaskTab 
              onTaskCreated={handleTaskCreated}
              sendSkill={sendSkill}
              isConnected={isConnected}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <TimelineTab 
              refreshKey={refreshKey}
              isConnected={isConnected}
              sendSkill={sendSkill}
              sendDigitalWrite={sendDigitalWrite}
              sendServoCommand={sendServoCommand}
              forceStopMotor={forceStopMotor}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SettingsTab 
              logs={logs}
              clearLogs={clearLogs}
              sendRawCommand={sendRawCommand}
              sendDigitalWrite={sendDigitalWrite}
              isConnected={isConnected}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
