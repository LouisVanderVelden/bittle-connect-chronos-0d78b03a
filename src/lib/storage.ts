// LocalStorage utilities for tasks and settings

export interface Task {
  id: string;
  time: string; // HH:MM format
  title: string;
  notes: string;
  status: 'neutral' | 'overdue' | 'done';
  createdAt: string;
  triggeredOverdue: boolean;
  triggeredDone: boolean;
}

export interface Settings {
  taskCreationSkill: string;
  overdueSkill: string;
  doneSkill1: string;
  doneDuration1: number;
  doneSkill2: string;
  doneDuration2: number;
}

const TASKS_KEY = 'bittle_tasks';
const SETTINGS_KEY = 'bittle_settings';

export const DEFAULT_SETTINGS: Settings = {
  taskCreationSkill: 'khi',
  overdueSkill: 'kpd',
  doneSkill1: 'kchr',
  doneDuration1: 10,
  doneSkill2: 'khg',
  doneDuration2: 10,
};

export function getTasks(): Task[] {
  try {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function addTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'triggeredOverdue' | 'triggeredDone'>): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    status: 'neutral',
    createdAt: new Date().toISOString(),
    triggeredOverdue: false,
    triggeredDone: false,
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  tasks[index] = { ...tasks[index], ...updates };
  saveTasks(tasks);
  return tasks[index];
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter(t => t.id !== id);
  saveTasks(tasks);
}

export function getSettings(): Settings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getTimeInMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getCurrentTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
