// 简化的客户端 Supabase 客户端
// 直接在浏览器中使用环境变量

class SupabaseTableClient {
  constructor(private supabase: any, private table: string) {}

  select(columns = '*') {
    return new SupabaseQueryBuilder(this.supabase.from(this.table).select(columns));
  }

  insert(data: any) {
    return {
      select: () => ({
        single: () => this.supabase.from(this.table).insert(data).select().single()
      })
    };
  }

  update(data: any) {
    return {
      eq: (column: string, value: any) => ({
        select: () => this.supabase.from(this.table).update(data).eq(column, value).select()
      })
    };
  }
}

class SupabaseQueryBuilder {
  constructor(private query: any) {}

  eq(column: string, value: any) {
    return {
      single: () => this.query.eq(column, value).single(),
      then: (callback: any) => this.query.eq(column, value).then(callback)
    };
  }

  single() {
    return {
      then: (callback: any) => this.query.single().then(callback)
    };
  }

  then(callback: any) {
    return this.query.then(callback);
  }

  order(column: string, options: any) {
    return new SupabaseQueryBuilder(this.query.order(column, options));
  }

  limit(count: number) {
    return new SupabaseQueryBuilder(this.query.limit(count));
  }
}

class SupabaseClientWrapper {
  private client: any = null;

  async init() {
    if (this.client) return;
    
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && anonKey) {
      this.client = createClient(url, anonKey);
    }
  }

  from(table: string): SupabaseTableClient {
    return new SupabaseTableClient(this.client, table);
  }
}

// 全局实例
const globalClient = new SupabaseClientWrapper();

// 导出初始化函数
export async function initSupabase() {
  await globalClient.init();
  return globalClient;
}

// 导出同步获取函数（首次调用会初始化）
export function getSupabaseClient() {
  return globalClient;
}
