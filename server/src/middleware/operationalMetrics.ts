import { Request, Response, NextFunction } from 'express';
const bounds = [25, 50, 100, 250, 500, 1000, 3000, 10000, 30000];
export class RequestMetrics {
  active = 0;
  private counts = { requests: 0, errors4xx: 0, errors5xx: 0, aborted: 0, totalMs: 0 };
  private latency = Array<number>(bounds.length + 1).fill(0);
  record(status: number, milliseconds: number, aborted = false): void {
    this.counts.requests++;
    this.counts.totalMs += milliseconds;
    if (status >= 500) this.counts.errors5xx++;
    else if (status >= 400) this.counts.errors4xx++;
    if (aborted) this.counts.aborted++;
    const bucket = bounds.findIndex((bound) => milliseconds <= bound);
    this.latency[bucket < 0 ? bounds.length : bucket]++;
  }
  drain() {
    let cumulative = 0,
      p95: number | string = 0;
    const threshold = Math.ceil(this.counts.requests * 0.95);
    for (let n = 0; threshold && n < this.latency.length; n++) {
      cumulative += this.latency[n];
      if (cumulative >= threshold) {
        p95 = bounds[n] || '>30000';
        break;
      }
    }
    const result = {
      ...this.counts,
      active: this.active,
      meanMs: this.counts.requests ? Math.round(this.counts.totalMs / this.counts.requests) : 0,
      p95UpperBoundMs: p95,
    };
    this.counts = { requests: 0, errors4xx: 0, errors5xx: 0, aborted: 0, totalMs: 0 };
    this.latency.fill(0);
    return result;
  }
}
export const requestMetrics = new RequestMetrics();
export function measureRequests(_req: Request, res: Response, next: NextFunction): void {
  const started = performance.now();
  requestMetrics.active++;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    requestMetrics.active--;
    requestMetrics.record(res.statusCode, performance.now() - started, !res.writableFinished);
  };
  res.once('finish', finish);
  res.once('close', finish);
  next();
}
