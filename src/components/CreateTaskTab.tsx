import { useState } from 'react';
import { Plus, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addTask, getSettings } from '@/lib/storage';

interface CreateTaskTabProps {
  onTaskCreated: () => void;
  sendSkill: (skill: string) => Promise<void>;
  isConnected: boolean;
}

export function CreateTaskTab({ onTaskCreated, sendSkill, isConnected }: CreateTaskTabProps) {
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!time || !title) return;

    addTask({ time, title, notes });
    
    // Send skill on task creation
    const settings = getSettings();
    if (isConnected && settings.taskCreationSkill) {
      await sendSkill(settings.taskCreationSkill);
    }

    setTime('');
    setTitle('');
    setNotes('');
    onTaskCreated();
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Plus className="h-6 w-6 text-primary" />
          Create New Task
        </CardTitle>
        <CardDescription>
          Schedule a task for Bittle to remind you about
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="bg-input/50 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Title
            </Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
              className="bg-input/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              className="bg-input/50 min-h-[100px]"
            />
          </div>

          <Button type="submit" className="w-full gap-2" size="lg">
            <Plus className="h-5 w-5" />
            Create Task
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
