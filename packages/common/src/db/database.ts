import Database from 'better-sqlite3'
import { RecordingSession, TestRun } from '../types/recording'

export class LocalDatabase {
  private db: Database.Database

  constructor(path: string) {
    this.db = new Database(path)
    this.initTables()
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recording_sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        steps TEXT NOT NULL,
        viewport TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        metadata TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        artifacts TEXT NOT NULL,
        errors TEXT,
        FOREIGN KEY (session_id) REFERENCES recording_sessions (id)
      );
    `)
  }

  saveSession(session: RecordingSession): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO recording_sessions 
      (id, name, url, created_at, updated_at, steps, viewport, user_agent, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      session.id,
      session.name,
      session.url,
      session.createdAt,
      session.updatedAt,
      JSON.stringify(session.steps),
      JSON.stringify(session.viewport),
      session.userAgent,
      JSON.stringify(session.metadata)
    )
  }

  getSession(id: string): RecordingSession | null {
    const stmt = this.db.prepare('SELECT * FROM recording_sessions WHERE id = ?')
    const row = stmt.get(id) as any
    
    if (!row) return null
    
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      steps: JSON.parse(row.steps),
      viewport: JSON.parse(row.viewport),
      userAgent: row.user_agent,
      metadata: JSON.parse(row.metadata)
    }
  }

  getAllSessions(): RecordingSession[] {
    const stmt = this.db.prepare('SELECT * FROM recording_sessions ORDER BY updated_at DESC')
    const rows = stmt.all() as any[]
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      steps: JSON.parse(row.steps),
      viewport: JSON.parse(row.viewport),
      userAgent: row.user_agent,
      metadata: JSON.parse(row.metadata)
    }))
  }

  saveTestRun(testRun: TestRun): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO test_runs 
      (id, session_id, status, started_at, completed_at, artifacts, errors)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      testRun.id,
      testRun.sessionId,
      testRun.status,
      testRun.startedAt,
      testRun.completedAt || null,
      JSON.stringify(testRun.artifacts),
      testRun.errors ? JSON.stringify(testRun.errors) : null
    )
  }

  close(): void {
    this.db.close()
  }
}
