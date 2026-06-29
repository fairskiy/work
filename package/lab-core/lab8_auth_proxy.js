class RateLimiter {
  constructor(limitPerSecond) {
    this.minInterval = 1000 / limitPerSecond;
    this.lastTime = 0;
  }

  async waitForTurn() {
    const wait = Math.max(0, this.lastTime + this.minInterval - Date.now());
    this.lastTime = Date.now() + wait;
    if (wait > 0) {
      console.log(`  [Rate Limiter] Waiting ${wait}ms...`);
      await new Promise(res => setTimeout(res, wait));
    }
  }
}

export class JwtStrategy {
  constructor(token) { this.token = token; }
  applyAuth(headers) { headers.set('Authorization', `Bearer ${this.token}`); }
  updateToken(newToken) { this.token = newToken; }
}

export class ApiProxy {
  constructor(strategy, rateLimit = 5) {
    this.strategy = strategy;
    this.limiter = new RateLimiter(rateLimit);
    this.refreshPromise = null;
  }

  async refresh() {
    console.log('  🔄 [Proxy] Token expired. Fetching a new one...');
    await new Promise(res => setTimeout(res, 1000));
    this.strategy.updateToken?.("new_fresh_token_123");
    console.log('  ✅ [Proxy] Token updated!');
  }

  _getOptions(baseOptions) {
    const headers = new Headers(baseOptions.headers || {});
    this.strategy.applyAuth(headers);
    return { ...baseOptions, headers };
  }

  async request(url, options = {}) {
    await this.limiter.waitForTurn();

    if (this.refreshPromise) {
      console.log(`  [Proxy] ${url} is waiting for token update...`);
      await this.refreshPromise;
    }

    console.log(`  [Proxy] Sending request to ${url}`);
    let response = await this.mockFetch(url, this._getOptions(options));

    if (response.status === 401) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refresh().finally(() => this.refreshPromise = null);
      }
      await this.refreshPromise;

      console.log(`  [Proxy] Resending request to ${url}...`);
      response = await this.mockFetch(url, this._getOptions(options));
    }

    return response;
  }

  async mockFetch(url, opts) {
    return opts.headers.get('Authorization') === 'Bearer old_expired_token'
      ? { status: 401, json: async () => ({ error: 'Unauthorized' }) }
      : { status: 200, json: async () => ({ data: `Success from ${url}` }) };
  }
}