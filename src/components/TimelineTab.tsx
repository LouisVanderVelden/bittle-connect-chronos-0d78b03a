import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Trash2, AlertCircle, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getTasks, 
  Task, 
  updateTask, 
  deleteTask,
  getTimeInMinutes, 
  getCurrentTimeInMinutes,
  getSettings,
  saveTasks
} from '@/lib/storage';

interface TimelineTabProps {
  refreshKey: number;
  isConnected: boolean;
  sendSkill: (skill: string) => Promise<void>;
  sendDigitalWrite: (port: number, value: 0 | 1) => Promise<void>;
  sendServoCommand: (command: string) => Promise<void>;
  forceStopMotor: () => Promise<void>;
}

// Sleep helper in milliseconds
function sleepMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function TimelineTab({ 
  refreshKey, 
  isConnected, 
  sendSkill, 
  sendDigitalWrite, 
  sendServoCommand,
  forceStopMotor 
}: TimelineTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInMinutes());
  const [processingTask, setProcessingTask] = useState<string | null>(null);
  const [sequenceLock, setSequenceLock] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const abortRef = useRef(false);

  const loadTasks = useCallback(() => {
    setTasks(getTasks());
  }, []);

  useEffect(() => {
    loadTasks();
  }, [refreshKey, loadTasks]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTimeInMinutes());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check for overdue tasks
  useEffect(() => {
    const checkOverdue = async () => {
      const allTasks = getTasks();
      const settings = getSettings();
      let updated = false;

      for (const task of allTasks) {
        const taskTime = getTimeInMinutes(task.time);
        
        if (task.status === 'neutral' && currentTime > taskTime) {
          task.status = 'overdue';
          
          if (!task.triggeredOverdue && isConnected && settings.overdueSkill) {
            await sendSkill(settings.overdueSkill);
            task.triggeredOverdue = true;
          }
          
          updated = true;
        }
      }

      if (updated) {
        saveTasks(allTasks);
        setTasks([...allTasks]);
      }
    };

    checkOverdue();
  }, [currentTime, isConnected, sendSkill]);

  // Emergency stop handler
  const handleEmergencyStop = async () => {
    abortRef.current = true;
    setCurrentStep('EMERGENCY STOP');
    await forceStopMotor();
    setSequenceLock(false);
    setProcessingTask(null);
    setCurrentStep(null);
    abortRef.current = false;
  };

  /**
   * DONE Sequence - Precision Reward Flow
   * 8-step async sequence with mandatory 3-second delays between every command
   */
  const handleDone = async (task: Task) => {
    // Prevent double-click triggering
    if (processingTask || sequenceLock) return;
    
    setProcessingTask(task.id);
    setSequenceLock(true);
    abortRef.current = false;
    
    const settings = getSettings();

    // Update task status immediately
    const updatedTask = updateTask(task.id, { 
      status: 'done', 
      triggeredDone: true 
    });
    
    if (updatedTask) {
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    }

    // Execute the DONE sequence with try...finally for reliability
    try {
      if (isConnected) {
        console.log(`[${new Date().toISOString()}] === STARTING 3-SECOND PRECISION DONE SEQUENCE ===`);
        console.log(`Task: ${task.title}`);

        // Step 1: Send Skill #1
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Step 1/8: Skill #1');
        console.log(`[${new Date().toISOString()}] Step 1: Sending Skill #1 (${settings.doneSkill1})`);
        await sendSkill(settings.doneSkill1);
        
        // Wait 3 seconds
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Waiting 3s...');
        console.log(`[${new Date().toISOString()}] Waiting 3000ms...`);
        await sleepMs(3000);
        
        // Step 2: Send Servo Command 1
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Step 2/8: Servo Cmd 1');
        console.log(`[${new Date().toISOString()}] Step 2: Sending Servo Command 1 (${settings.servoCommand1})`);
        await sendServoCommand(settings.servoCommand1);
        
        // Wait 3 seconds
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Waiting 3s...');
        console.log(`[${new Date().toISOString()}] Waiting 3000ms...`);
        await sleepMs(3000);
        
        // Step 3: Motor ON
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Step 3/8: Motor ON');
        console.log(`[${new Date().toISOString()}] Step 3: Motor 9 HIGH`);
        await sendDigitalWrite(9, 1);
        
        // Wait 3 seconds
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Waiting 3s...');
        console.log(`[${new Date().toISOString()}] Waiting 3000ms...`);
        await sleepMs(3000);
        
        // Step 4: Send Servo Command 2
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Step 4/8: Servo Cmd 2');
        console.log(`[${new Date().toISOString()}] Step 4: Sending Servo Command 2 (${settings.servoCommand2})`);
        await sendServoCommand(settings.servoCommand2);
        
        // Wait 3 seconds
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Waiting 3s...');
        console.log(`[${new Date().toISOString()}] Waiting 3000ms...`);
        await sleepMs(3000);
        
        // Step 5: Send Skill #2
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Step 5/8: Skill #2');
        console.log(`[${new Date().toISOString()}] Step 5: Sending Skill #2 (${settings.doneSkill2})`);
        await sendSkill(settings.doneSkill2);
        
        // Wait 3 seconds
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Waiting 3s...');
        console.log(`[${new Date().toISOString()}] Waiting 3000ms...`);
        await sleepMs(3000);
        
        // Step 6: Send Skill #3
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Step 6/8: Skill #3');
        console.log(`[${new Date().toISOString()}] Step 6: Sending Skill #3 (${settings.doneSkill3})`);
        await sendSkill(settings.doneSkill3);
        
        // Wait 3 seconds
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Waiting 3s...');
        console.log(`[${new Date().toISOString()}] Waiting 3000ms...`);
        await sleepMs(3000);
        
        // Step 7: Motor OFF
        if (abortRef.current) throw new Error('Aborted');
        setCurrentStep('Step 7/8: Motor OFF');
        console.log(`[${new Date().toISOString()}] Step 7: Motor 9 LOW`);
        await sendDigitalWrite(9, 0);
        
        // Wait 3 seconds (end sequence)
        setCurrentStep('Step 8/8: Final wait 3s');
        console.log(`[${new Date().toISOString()}] Step 8: Final wait 3000ms...`);
        await sleepMs(3000);

        console.log(`[${new Date().toISOString()}] === DONE SEQUENCE COMPLETED ===`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] DONE sequence error:`, error);
      // Attempt to turn motor off even if sequence fails
      try {
        await sendDigitalWrite(9, 0);
      } catch {
        console.error('Failed to turn off motor after error');
      }
    } finally {
      // Always release the lock
      setProcessingTask(null);
      setSequenceLock(false);
      setCurrentStep(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const nowPosition = (currentTime / 1440) * 100;
  
  const sortedTasks = [...tasks].sort((a, b) => 
    getTimeInMinutes(a.time) - getTimeInMinutes(b.time)
  );

  return (
    <div className="space-y-6">
      {/* Timeline Bar */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal flex justify-between">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="timeline-bar relative">
            {/* Now marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-primary glow-primary z-10"
              style={{ left: `${nowPosition}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full glow-primary" />
            </div>
            
            {/* Task markers */}
            {sortedTasks.map(task => {
              const pos = (getTimeInMinutes(task.time) / 1440) * 100;
              return (
                <div
                  key={task.id}
                  className={`absolute top-0 bottom-0 w-2 rounded-full ${
                    task.status === 'done' ? 'bg-success' :
                    task.status === 'overdue' ? 'bg-destructive' :
                    'bg-neutral-task'
                  }`}
                  style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                />
              );
            })}
          </div>
          
          <div className="mt-3 text-center">
            <span className="text-sm text-muted-foreground">Now: </span>
            <span className="font-mono text-primary font-medium">
              {String(Math.floor(currentTime / 60)).padStart(2, '0')}:
              {String(currentTime % 60).padStart(2, '0')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sequence Running Indicator with Emergency Stop */}
      {sequenceLock && (
        <Card className="border-primary/50 bg-primary/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                <div>
                  <span className="font-medium text-primary">DONE sequence running</span>
                  {currentStep && (
                    <p className="text-sm text-muted-foreground font-mono">{currentStep}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleEmergencyStop}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                STOP MOTOR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks scheduled</p>
              <p className="text-sm">Create a task to get started</p>
            </CardContent>
          </Card>
        ) : (
          sortedTasks.map(task => (
            <Card 
              key={task.id} 
              className={`border-border/50 transition-all ${
                task.status === 'done' ? 'task-done' :
                task.status === 'overdue' ? 'task-overdue' :
                'task-neutral'
              } ${
                task.status === 'done' ? 'glow-success' :
                task.status === 'overdue' ? 'glow-destructive' : ''
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-lg font-semibold min-w-[60px]">
                      {task.time}
                    </span>
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      {task.notes && (
                        <p className="text-sm opacity-80 mt-1">{task.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {task.status !== 'done' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDone(task)}
                        disabled={processingTask !== null || sequenceLock}
                        className="gap-1"
                      >
                        <Check className="h-4 w-4" />
                        {processingTask === task.id ? 'Running...' : 'Done'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(task.id)}
                      disabled={sequenceLock}
                      className="text-destructive-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
