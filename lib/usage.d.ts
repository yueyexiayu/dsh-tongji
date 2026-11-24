/**
 * tongji v0.1.30
 * DSH 会话可观测性面板：统计、上下文、编队与跨会话洞察。
 * @author yueyexiayu <yueyexiayu@users.noreply.github.com>
 * @license Apache-2.0
 * @homepage https://github.com/yueyexiayu/dsh-tongji#readme
 * @built 2026-11-24T08:43:11+08:00
 * @commit f3153ab68a51 (dirty working tree) on main
 * @commit-date 2026-11-24T06:52:56+08:00
 */

/** Reusable fold cache for one Host owner. */
export declare function createUsageCollector(observe: any, options?: {}): {
  collect: (rootId: any, signal: any) => Promise<{
    turns: {};
    total: {
      steps: {};
      input: number;
      output: number;
      read: number;
      write: number;
      samples: number;
      unknown: number;
      cacheInput: number;
      cacheSamples: number;
      cacheMissing: number;
    };
  }>;
};
/** Read a complete tree once. Host integrations should reuse createUsageCollector instead. */
export declare function collectUsage(rootId: any, observe: any, signal: any): Promise<{
  turns: {};
  total: {
    steps: {};
    input: number;
    output: number;
    read: number;
    write: number;
    samples: number;
    unknown: number;
    cacheInput: number;
    cacheSamples: number;
    cacheMissing: number;
  };
}>;
export declare class UsageError extends Error {
  constructor(message: any, code: any);
  code: any;
}