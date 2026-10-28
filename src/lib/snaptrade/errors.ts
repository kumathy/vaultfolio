export class SnapTradeApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`SnapTrade API error: HTTP ${status} on ${path}`);
    this.name = "SnapTradeApiError";
  }

  // https://docs.snaptrade.com/docs/ratelimiting.md: 429 once a per-minute
  // limit (per app, or per account for Personal users) is reached.
  get rateLimited(): boolean {
    return this.status === 429;
  }
}
