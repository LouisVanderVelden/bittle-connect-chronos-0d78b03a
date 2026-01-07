import { useState, useEffect, useCallback } from 'react';
import { Check, Trash2, AlertCircle } from 'lucide-react';
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
}

// Sleep helper in milliseconds
function sleepMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function TimelineTab({ refreshKey, isConnected, sendSkill, sendDigitalWrite }: TimelineTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInMinutes());
  const [processingTask, setProcessingTask] = useState<string | null>(null);
  const [sequenceLock, setSequenceLock] = useState(false);

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

  /**
   * DONE Sequence with proper timing and buffer handling
   * Wrapped in try...finally to prevent stuck state
   */
  const handleDone = async (task: Task) => {
    // Prevent double-click triggering
    if (processingTask || sequenceLock) return;
    
    setProcessingTask(task.id);
    setSequenceLock(true);
    
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
        console.log(`[${new Date().toISOString()}] === STARTING DONE SEQUENCE ===`);
        console.log(`Task: ${task.title}`);

        // Step 1: Send Skill #1
        console.log(`[${new Date().toISOString()}] Step 1: Sending Skill 1 (${settings.doneSkill1})`);
        await sendSkill(settings.doneSkill1);
        
        // Mandatory 1000ms wait for Bittle to start motion and clear buffer
        console.log(`[${new Date().toISOString()}] Waiting 1000ms for buffer clear...`);
        await sleepMs(1000);
        
        // Step 2: Motor ON
        console.log(`[${new Date().toISOString()}] Step 2: Motor 9 HIGH`);
        await sendDigitalWrite(9, 1);
        
        // Step 3: Wait for user-configured duration
        console.log(`[${new Date().toISOString()}] Step 3: Waiting ${settings.doneDuration1} seconds...`);
        await sleepMs(settings.doneDuration1 * 1000);
        
        // Step 4: Motor OFF
        console.log(`[${new Date().toISOString()}] Step 4: Motor 9 LOW`);
        await sendDigitalWrite(9, 0);
        
        // Brief pause before next skill
        console.log(`[${new Date().toISOString()}] Pause 500ms before Skill 2...`);
        await sleepMs(500);
        
        // Step 5: Send Skill #2
        console.log(`[${new Date().toISOString()}] Step 5: Sending Skill 2 (${settings.doneSkill2})`);
        await sendSkill(settings.doneSkill2);
        
        // Mandatory 1000ms wait
        console.log(`[${new Date().toISOString()}] Waiting 1000ms for buffer clear...`);
        await sleepMs(1000);
        
        // Step 6: Motor ON
        console.log(`[${new Date().toISOString()}] Step 6: Motor 9 HIGH`);
        await sendDigitalWrite(9, 1);
        
        // Step 7: Wait for user-configured duration
        console.log(`[${new Date().toISOString()}] Step 7: Waiting ${settings.doneDuration2} seconds...`);
        await sleepMs(settings.doneDuration2 * 1000);
        
        // Step 8: Motor OFF
        console.log(`[${new Date().toISOString()}] Step 8: Motor 9 LOW`);
        await sendDigitalWrite(9, 0);

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

      {/* Sequence Running Indicator */}
      {sequenceLock && (
        <Card className="border-primary/50 bg-primary/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
              <span className="font-medium text-primary">DONE sequence running...</span>
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
