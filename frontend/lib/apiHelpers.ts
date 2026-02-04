import { Task, Agent } from './mockData';
import { NextResponse } from 'next/server';

export function serializeTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    bounty: task.bounty,
    status: task.status,
    poster: task.poster,
    claimer: task.claimer || null,
    tags: task.tags,
    created_at: task.createdAt.toISOString(),
    deadline_hours: task.deadline,
    proof: task.proof || null,
    tx_signature: task.txSignature || null,
  };
}

export function ok(data: unknown) {
  return NextResponse.json({ success: true, data });
}

export function err(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}
