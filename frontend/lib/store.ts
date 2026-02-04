import { Task, Agent, TaskStatus, FeedItem, agents as mockAgents, tasks as mockTasks, feedItems as mockFeedItems, stats as mockStats } from './mockData';

// In-memory store initialized from mock data
// Mutations persist until server restart

let taskIdCounter = mockTasks.length + 1;

class Store {
  private tasks: Task[];
  private agents: Agent[];
  private feedItems: FeedItem[];

  constructor() {
    // Deep clone mock data so mutations don't affect the originals
    this.tasks = mockTasks.map(t => ({ ...t }));
    this.agents = mockAgents.map(a => ({ ...a }));
    this.feedItems = mockFeedItems.map(f => ({ ...f }));
  }

  // === Tasks ===

  getAllTasks(filters?: {
    status?: TaskStatus;
    tags?: string;
    sort?: 'newest' | 'bounty' | 'deadline';
    limit?: number;
  }): Task[] {
    let result = [...this.tasks];

    if (filters?.status) {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters?.tags) {
      const tagList = filters.tags.split(',').map(t => t.trim().toLowerCase());
      result = result.filter(t =>
        t.tags.some(tag => tagList.includes(tag.toLowerCase()))
      );
    }

    const sort = filters?.sort || 'newest';
    switch (sort) {
      case 'newest':
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'bounty':
        result.sort((a, b) => b.bounty - a.bounty);
        break;
      case 'deadline':
        result.sort((a, b) => a.deadline - b.deadline);
        break;
    }

    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.find(t => t.id === id);
  }

  createTask(data: {
    creator: string;
    title?: string;
    description: string;
    bounty: number;
    tags: string[];
    deadline?: number;
  }): Task {
    const task: Task = {
      id: String(taskIdCounter++),
      title: data.title || data.description.slice(0, 60),
      description: data.description,
      bounty: data.bounty,
      status: 'open',
      poster: data.creator,
      tags: data.tags,
      createdAt: new Date(),
      deadline: data.deadline || 24,
    };
    this.tasks.push(task);
    this.addFeedItem('posted', data.creator, task.title, task.bounty);
    return task;
  }

  claimTask(id: string, claimer: string): Task | null {
    const task = this.getTask(id);
    if (!task) return null;
    if (task.status !== 'open') return null;
    task.status = 'claimed';
    task.claimer = claimer;
    this.addFeedItem('claimed', claimer, task.title, task.bounty);
    return task;
  }

  submitWork(id: string, data: { proof_url?: string; proof_hash?: string; note?: string }): Task | null {
    const task = this.getTask(id);
    if (!task) return null;
    if (task.status !== 'claimed') return null;
    task.status = 'submitted';
    task.proof = data.proof_url || data.proof_hash || data.note || '';
    this.addFeedItem('submitted', task.claimer || 'unknown', task.title, task.bounty);
    return task;
  }

  approveTask(id: string): Task | null {
    const task = this.getTask(id);
    if (!task) return null;
    if (task.status !== 'submitted') return null;
    task.status = 'completed';
    this.addFeedItem('completed', task.claimer || 'unknown', task.title, task.bounty);
    // Update agent stats
    if (task.claimer) {
      const agent = this.getAgent(task.claimer);
      if (agent) {
        agent.tasksCompleted++;
        agent.solEarned = Math.round((agent.solEarned + task.bounty * 0.98) * 1000) / 1000;
      }
    }
    return task;
  }

  rejectTask(id: string): Task | null {
    const task = this.getTask(id);
    if (!task) return null;
    if (task.status !== 'submitted') return null;
    task.status = 'claimed'; // back to claimed, worker can resubmit
    return task;
  }

  cancelTask(id: string, requester: string): Task | null {
    const task = this.getTask(id);
    if (!task) return null;
    if (task.poster !== requester) return null;
    if (task.status !== 'open') return null;
    task.status = 'cancelled';
    return task;
  }

  // === Agents ===

  getAllAgents(): Agent[] {
    return [...this.agents].sort((a, b) => b.solEarned - a.solEarned);
  }

  getAgent(name: string): Agent | undefined {
    return this.agents.find(a => a.name === name);
  }

  getAgentTasks(name: string): Task[] {
    return this.tasks.filter(t => t.poster === name || t.claimer === name);
  }

  // === Stats ===

  getStats() {
    const totalEscrowed = this.tasks
      .filter(t => ['open', 'claimed', 'submitted'].includes(t.status))
      .reduce((sum, t) => sum + t.bounty, 0);
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    return {
      totalEscrowed: Math.round(totalEscrowed * 100) / 100,
      tasksCompleted: completed + mockStats.tasksCompleted, // add historical
      activeAgents: this.agents.length,
      totalTasks: this.tasks.length,
      openTasks: this.tasks.filter(t => t.status === 'open').length,
    };
  }

  // === Feed ===

  getFeed(): FeedItem[] {
    return this.feedItems;
  }

  private addFeedItem(type: FeedItem['type'], agent: string, taskTitle: string, bounty: number) {
    this.feedItems.unshift({
      type,
      agent,
      taskTitle,
      bounty,
      timestamp: new Date(),
    });
    // Keep feed at max 50 items
    if (this.feedItems.length > 50) {
      this.feedItems = this.feedItems.slice(0, 50);
    }
  }
}

// Singleton
export const store = new Store();
