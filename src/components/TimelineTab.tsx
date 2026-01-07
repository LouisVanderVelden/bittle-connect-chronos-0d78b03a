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

function sleep(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export function TimelineTab({ refreshKey, isConnected, sendSkill, sendDigitalWrite }: TimelineTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeInMinutes());
  const [processingTask, setProcessingTask] = useState<string | null>(null);

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

  const handleDone = async (task: Task) => {
    if (processingTask) return;
    
    setProcessingTask(task.id);
    const settings = getSettings();

    // Update task status immediately
    const updatedTask = updateTask(task.id, { 
      status: 'done', 
      triggeredDone: true 
    });
    
    if (updatedTask) {
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    }

    // Execute the DONE sequence
    if (isConnected) {
      console.log(`[${new Date().toISOString()}] Starting DONE sequence for task: ${task.title}`);

      // Step 1: Send Skill #1
      await sendSkill(settings.doneSkill1);
      
      // Step 2: Motor ON
      await sendDigitalWrite(9, 1);
      
      // Step 3: Wait duration #1
      await sleep(settings.doneDuration1);
      
      // Step 4: Motor OFF
      await sendDigitalWrite(9, 0);
      
      // Step 5: Send Skill #2
      await sendSkill(settings.doneSkill2);
      
      // Step 6: Motor ON
      await sendDigitalWrite(9, 1);
      
      // Step 7: Wait duration #2
      await sleep(settings.doneDuration2);
      
      // Step 8: Motor OFF
      await sendDigitalWrite(9, 0);

      console.log(`[${new Date().toISOString()}] DONE sequence completed for task: ${task.title}`);
    }

    setProcessingTask(null);
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
                        disabled={processingTask !== null}
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
