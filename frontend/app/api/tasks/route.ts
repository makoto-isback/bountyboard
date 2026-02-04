import { NextRequest } from 'next/server';
import { Connection } from '@solana/web3.js';
import { store } from '@/lib/store';
import { serializeTask, ok, err } from '@/lib/apiHelpers';
import { TaskStatus } from '@/lib/mockData';
import { USE_ONCHAIN, SOLANA_RPC } from '@/lib/config';
import { fetchAllTasks, onChainTaskToFrontend } from '@/lib/solana';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') as TaskStatus | null;
  const tags = searchParams.get('tags');
  const sort = searchParams.get('sort') as 'newest' | 'bounty' | 'deadline' | null;
  const limit = searchParams.get('limit');

  // Try on-chain data first
  if (USE_ONCHAIN) {
    try {
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const onChainTasks = await fetchAllTasks(connection);
      let results = onChainTasks.map(onChainTaskToFrontend);

      // Apply filters
      if (status) {
        results = results.filter(t => t.status === status);
      }
      if (tags) {
        const tagList = tags.split(',').map(t => t.trim().toLowerCase());
        results = results.filter(t =>
          t.tags.some(tag => tagList.includes(tag.toLowerCase()))
        );
      }

      // Apply sort
      const sortBy = sort || 'newest';
      switch (sortBy) {
        case 'newest':
          results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
        case 'bounty':
          results.sort((a, b) => b.bounty - a.bounty);
          break;
        case 'deadline':
          results.sort((a, b) => a.deadline_hours - b.deadline_hours);
          break;
      }

      if (limit) {
        results = results.slice(0, parseInt(limit));
      }

      return ok(results);
    } catch (e) {
      console.error('On-chain fetch failed, falling back to mock data:', e);
    }
  }

  // Fallback to mock data
  const tasks = store.getAllTasks({
    status: status || undefined,
    tags: tags || undefined,
    sort: sort || undefined,
    limit: limit ? parseInt(limit) : undefined,
  });

  return ok(tasks.map(serializeTask));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creator, description, bounty, tags, deadline, title } = body;

    if (!creator) return err('creator is required');
    if (!description) return err('description is required');
    if (!bounty || bounty <= 0) return err('bounty must be a positive number');
    if (!tags || !Array.isArray(tags) || tags.length === 0) return err('tags must be a non-empty array');

    const task = store.createTask({
      creator,
      title,
      description,
      bounty,
      tags,
      deadline: deadline || 24,
    });

    return ok(serializeTask(task));
  } catch {
    return err('Invalid request body', 400);
  }
}
