import { RequestMetrics } from '../../src/middleware/operationalMetrics';
describe('Bounded operational counters', () => {
  it('reports status totals and bounded latency without retaining request data', () => {
    const metrics = new RequestMetrics();
    for (let n = 0; n < 95; n++) metrics.record(200, 80);
    metrics.record(401, 120);
    metrics.record(500, 20000);
    metrics.record(503, 40000, true);
    const result = metrics.drain();
    expect(result).toMatchObject({ requests: 98, errors4xx: 1, errors5xx: 2, aborted: 1, p95UpperBoundMs: 100 });
    expect(metrics.drain()).toMatchObject({ requests: 0, errors5xx: 0, p95UpperBoundMs: 0 });
    expect(Object.keys(result)).not.toEqual(expect.arrayContaining(['url', 'email', 'token']));
  });
});
