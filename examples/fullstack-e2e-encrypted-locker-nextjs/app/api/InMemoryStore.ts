import { readFile, writeFile } from "fs/promises";
import { Datastore, SessionEntry } from "./Datastore";
import { Locker, RecoveryLockbox } from "../utils/locker";

const MILLISECONDS_PER_DAY =
  24 /*hours*/ * 60 /*minutes*/ * 60 /*seconds*/ * 1000; /*milliseconds*/

type LoginState = { value: string; timestamp: number };

type Schema = {
  users: Record<string, string>;
  logins: Record<string, LoginState>;
  lockers: Record<string, Locker>;
  sessions: Record<string, SessionEntry & { expiresAt: number }>;
  recovery: Record<string, RecoveryLockbox>;
};

export default class InMemoryStore implements Datastore {
  private data: Schema;
  constructor(
    data: Partial<Schema> = {},
    private listeners: (() => Promise<void>)[] = []
  ) {
    this.data = {
      users: {},
      logins: {},
      lockers: {},
      sessions: {},
      recovery: {},
      ...data,
    };
  }
  addListener(listener: () => Promise<void>) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  _notifyListeners() {
    return Promise.all(this.listeners.map((f) => f()));
  }
  static empty() {
    return new InMemoryStore();
  }
  stringify() {
    return JSON.stringify(this.data, null, 2);
  }
  async getUser(name: string) {
    return this.data.users[name];
  }
  async hasUser(name: string) {
    return this.data.users[name] != null;
  }
  async getLogin(name: string) {
    const hasLogin = await this.hasLogin(name);
    return hasLogin ? this.data.logins[name].value : null;
  }
  async hasLogin(name: string) {
    const login = this.data.logins[name];
    if (login == null) return false;
    const now = new Date().getTime();
    const elapsed = now - login.timestamp;
    return elapsed < 2000;
  }
  async setUser(name: string, value: string) {
    this.data.users[name] = value;
    await this._notifyListeners();
  }
  async setLogin(name: string, value: string) {
    this.data.logins[name] = { value, timestamp: new Date().getTime() };
    await this._notifyListeners();
  }
  async removeLogin(name: string) {
    delete this.data.logins[name];
    await this._notifyListeners();
  }
  async setLocker(name: string, entry: Locker) {
    this.data.lockers[name] = entry;
    await this._notifyListeners();
  }
  async getLocker(name: string): Promise<Locker | null> {
    return this.data.lockers[name];
  }
  async setRecoveryLockbox(name: string, entry: RecoveryLockbox) {
    this.data.recovery[name] = entry;
    await this._notifyListeners();
  }
  async getRecoveryLockbox(name: string): Promise<RecoveryLockbox | null> {
    return this.data.recovery[name];
  }
  async removeRecoveryLockbox(name: string) {
    delete this.data.recovery[name];
    await this._notifyListeners();
  }
  async setSession(
    id: string,
    entry: SessionEntry,
    lifetimeInDays: number = 14
  ) {
    const expiresAt =
      new Date().getTime() + lifetimeInDays * MILLISECONDS_PER_DAY;
    this.data.sessions[id] = { ...entry, expiresAt };
    this._notifyListeners();
  }
  async getSession(id: string): Promise<SessionEntry | null> {
    const session = this.data.sessions[id];
    if (session == null) return null;
    const { expiresAt, ...sessionData } = session;
    if (expiresAt < new Date().getTime()) {
      await this.removeSession(id);
      return null;
    }
    return sessionData;
  }
  async removeSession(id: string) {
    delete this.data.sessions[id];
    this._notifyListeners();
  }
}

export async function readDatabaseFile(filePath: string) {
  const json = await readFile(filePath, "utf-8");
  const data = JSON.parse(json);
  const db = new InMemoryStore(data);
  return db;
}

export function writeDatabaseFile(filePath: string, db: InMemoryStore) {
  const data = db.stringify();
  return writeFile(filePath, data);
}
