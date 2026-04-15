// Mock Supabase client using localStorage as database
// Used when VITE_SUPABASE_PUBLISHABLE_KEY=mock_key

const DB_PREFIX = 'mock_db_';
const STORAGE_PREFIX = 'mock_storage_';

function getTable(table: string): any[] {
  const stored = localStorage.getItem(`${DB_PREFIX}${table}`);
  return stored ? JSON.parse(stored) : [];
}

function saveTable(table: string, data: any[]): void {
  localStorage.setItem(`${DB_PREFIX}${table}`, JSON.stringify(data));
}

function seedIfEmpty(table: string, rows: any[]): void {
  const existing = getTable(table);
  if (existing.length === 0) saveTable(table, rows);
}

function getStorageBucket(bucket: string): Record<string, string> {
  const stored = localStorage.getItem(`${STORAGE_PREFIX}${bucket}`);
  return stored ? JSON.parse(stored) : {};
}

function saveStorageBucket(bucket: string, data: Record<string, string>): void {
  localStorage.setItem(`${STORAGE_PREFIX}${bucket}`, JSON.stringify(data));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Seed default data
function seedDefaultData() {
  seedIfEmpty('teams', [
    { id: 'equipe-7', name: 'Equipe 7', created_at: new Date().toISOString() },
    { id: 'tropa-de-elite', name: 'Tropa de Elite', created_at: new Date().toISOString() },
  ]);

  seedIfEmpty('exec_boards', [
    { id: 'board-geral-1', name: 'Quadro Principal', sector: 'GERAL', is_default: true, team_id: null, created_at: new Date().toISOString() },
    { id: 'board-trafego-1', name: 'Quadro Tráfego', sector: 'TRAFEGO', is_default: true, team_id: null, created_at: new Date().toISOString() },
    { id: 'board-atendimento-1', name: 'Quadro Atendimento', sector: 'ATENDIMENTO', is_default: true, team_id: null, created_at: new Date().toISOString() },
    { id: 'board-marketing-1', name: 'Quadro Marketing', sector: 'MARKETING_DIGITAL', is_default: true, team_id: null, created_at: new Date().toISOString() },
  ]);

  seedIfEmpty('exec_columns', [
    { id: 'col-1', name: 'A Fazer', board_id: 'board-geral-1', position: 0, color: '#6366f1', created_at: new Date().toISOString() },
    { id: 'col-2', name: 'Em Andamento', board_id: 'board-geral-1', position: 1, color: '#f59e0b', created_at: new Date().toISOString() },
    { id: 'col-3', name: 'Concluído', board_id: 'board-geral-1', position: 2, color: '#10b981', created_at: new Date().toISOString() },
    { id: 'col-4', name: 'A Fazer', board_id: 'board-trafego-1', position: 0, color: '#3b82f6', created_at: new Date().toISOString() },
    { id: 'col-5', name: 'Em Andamento', board_id: 'board-trafego-1', position: 1, color: '#f59e0b', created_at: new Date().toISOString() },
    { id: 'col-6', name: 'Concluído', board_id: 'board-trafego-1', position: 2, color: '#10b981', created_at: new Date().toISOString() },
    { id: 'col-7', name: 'A Fazer', board_id: 'board-atendimento-1', position: 0, color: '#8b5cf6', created_at: new Date().toISOString() },
    { id: 'col-8', name: 'Em Andamento', board_id: 'board-atendimento-1', position: 1, color: '#f59e0b', created_at: new Date().toISOString() },
    { id: 'col-9', name: 'Concluído', board_id: 'board-atendimento-1', position: 2, color: '#10b981', created_at: new Date().toISOString() },
    { id: 'col-10', name: 'A Fazer', board_id: 'board-marketing-1', position: 0, color: '#ec4899', created_at: new Date().toISOString() },
    { id: 'col-11', name: 'Em Andamento', board_id: 'board-marketing-1', position: 1, color: '#f59e0b', created_at: new Date().toISOString() },
    { id: 'col-12', name: 'Concluído', board_id: 'board-marketing-1', position: 2, color: '#10b981', created_at: new Date().toISOString() },
  ]);

  seedIfEmpty('announcements', []);
  seedIfEmpty('my_day_items', []);
  seedIfEmpty('work_items', []);
  seedIfEmpty('operational_clients', []);
  seedIfEmpty('ad_creatives', []);
  seedIfEmpty('exec_cards', []);
  seedIfEmpty('meetings', []);
  seedIfEmpty('profiles', []);
  seedIfEmpty('study_categories', []);
  seedIfEmpty('study_resources', []);
  seedIfEmpty('crm_events', []);
  seedIfEmpty('client_activity_tracking', []);
}

seedDefaultData();

// Query Builder

type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

class MockQueryBuilder {
  private _table: string;
  private _filters: Array<(row: any) => boolean> = [];
  private _orderField: string | null = null;
  private _orderAsc = true;
  private _limitCount: number | null = null;
  private _isSingle = false;
  private _isMaybeSingle = false;
  private _operation: Operation = 'select';
  private _writeData: any = null;
  private _returnAfterWrite = false;
  private _notFilters: Array<(row: any) => boolean> = [];

  constructor(table: string) {
    this._table = table;
  }

  select(_columns?: string): this {
    if (this._operation !== 'select') {
      this._returnAfterWrite = true;
    }
    return this;
  }

  insert(data: any | any[]): this {
    this._operation = 'insert';
    this._writeData = data;
    return this;
  }

  update(data: any): this {
    this._operation = 'update';
    this._writeData = data;
    return this;
  }

  delete(): this {
    this._operation = 'delete';
    return this;
  }

  upsert(data: any | any[], _opts?: any): this {
    this._operation = 'upsert';
    this._writeData = data;
    return this;
  }

  eq(column: string, value: any): this {
    this._filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any): this {
    this._filters.push((row) => row[column] !== value);
    return this;
  }

  in(column: string, values: any[]): this {
    this._filters.push((row) => values.includes(row[column]));
    return this;
  }

  is(column: string, value: any): this {
    this._filters.push((row) =>
      value === null ? row[column] == null : row[column] === value
    );
    return this;
  }

  ilike(column: string, pattern: string): this {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
    this._filters.push((row) => row[column] != null && regex.test(row[column]));
    return this;
  }

  or(_query: string): this {
    // Simplified: ignore or-filters in mock (returns all)
    return this;
  }

  not(column: string, operator: string, value: any): this {
    if (operator === 'is') {
      this._filters.push((row) => row[column] != null);
    }
    return this;
  }

  gte(column: string, value: any): this {
    this._filters.push((row) => row[column] >= value);
    return this;
  }

  lte(column: string, value: any): this {
    this._filters.push((row) => row[column] <= value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this._orderField = column;
    this._orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number): this {
    this._limitCount = count;
    return this;
  }

  range(_from: number, _to: number): this {
    return this;
  }

  single(): this {
    this._isSingle = true;
    return this;
  }

  maybeSingle(): this {
    this._isMaybeSingle = true;
    return this;
  }

  // Make it awaitable (thenable)
  then(
    resolve: (value: { data: any; error: any }) => any,
    reject?: (reason?: any) => any
  ): Promise<any> {
    return this._execute().then(resolve, reject);
  }

  private _applyFilters(data: any[]): any[] {
    return data.filter((row) => this._filters.every((f) => f(row)));
  }

  private _applyOrder(data: any[]): any[] {
    if (!this._orderField) return data;
    const field = this._orderField;
    return [...data].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return this._orderAsc ? cmp : -cmp;
    });
  }

  private async _execute(): Promise<{ data: any; error: any }> {
    try {
      let tableData = getTable(this._table);

      if (this._operation === 'select') {
        let result = this._applyFilters(tableData);
        result = this._applyOrder(result);
        if (this._limitCount !== null) result = result.slice(0, this._limitCount);

        if (this._isSingle) {
          if (result.length === 0)
            return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
          return { data: result[0], error: null };
        }
        if (this._isMaybeSingle) {
          return { data: result[0] ?? null, error: null };
        }
        return { data: result, error: null };
      }

      if (this._operation === 'insert') {
        const items = Array.isArray(this._writeData) ? this._writeData : [this._writeData];
        const now = new Date().toISOString();
        const newItems = items.map((item: any) => ({
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
          ...item,
        }));
        saveTable(this._table, [...tableData, ...newItems]);

        if (this._returnAfterWrite) {
          return {
            data: this._isSingle ? newItems[0] : newItems,
            error: null,
          };
        }
        return { data: null, error: null };
      }

      if (this._operation === 'update') {
        const now = new Date().toISOString();
        const updated: any[] = [];
        const newData = tableData.map((row: any) => {
          if (this._filters.every((f) => f(row))) {
            const newRow = { ...row, ...this._writeData, updated_at: now };
            updated.push(newRow);
            return newRow;
          }
          return row;
        });
        saveTable(this._table, newData);

        if (this._returnAfterWrite) {
          return {
            data: this._isSingle ? updated[0] ?? null : updated,
            error: null,
          };
        }
        return { data: null, error: null };
      }

      if (this._operation === 'delete') {
        const toDelete = this._applyFilters(tableData);
        const ids = new Set(toDelete.map((r: any) => r.id));
        saveTable(this._table, tableData.filter((r: any) => !ids.has(r.id)));
        return { data: null, error: null };
      }

      if (this._operation === 'upsert') {
        const items = Array.isArray(this._writeData) ? this._writeData : [this._writeData];
        const now = new Date().toISOString();
        items.forEach((item: any) => {
          const idx = tableData.findIndex((r: any) => r.id === item.id);
          if (idx >= 0) {
            tableData[idx] = { ...tableData[idx], ...item, updated_at: now };
          } else {
            tableData.push({ id: crypto.randomUUID(), created_at: now, updated_at: now, ...item });
          }
        });
        saveTable(this._table, tableData);
        return { data: items, error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

// Mock Realtime Channel

class MockChannel {
  on(_event: string, _filter: any, _callback: any): this {
    return this;
  }
  subscribe(_callback?: any): this {
    return this;
  }
  unsubscribe(): void {}
}

class MockStorageBucket {
  constructor(private bucket: string) {}

  async upload(path: string, file: File) {
    const bucketData = getStorageBucket(this.bucket);
    bucketData[path] = await readFileAsDataUrl(file);
    saveStorageBucket(this.bucket, bucketData);
    return { data: { path }, error: null };
  }

  getPublicUrl(path: string) {
    const bucketData = getStorageBucket(this.bucket);
    return { data: { publicUrl: bucketData[path] || '' } };
  }

  async remove(paths: string[]) {
    const bucketData = getStorageBucket(this.bucket);
    paths.forEach((path) => {
      delete bucketData[path];
    });
    saveStorageBucket(this.bucket, bucketData);
    return { data: null, error: null };
  }
}

// Mock Client

export class MockSupabaseClient {
  from(table: string): MockQueryBuilder {
    return new MockQueryBuilder(table);
  }

  channel(_name: string): MockChannel {
    return new MockChannel();
  }

  removeChannel(_channel: any): void {}

  storage = {
    from: (bucket: string) => new MockStorageBucket(bucket),
  };

  auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => {
      const rawUser = localStorage.getItem('great_user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      return { data: { user }, error: null };
    },
    onAuthStateChange: (_event: any, _callback: any) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
  };
}

export const mockSupabase = new MockSupabaseClient();
