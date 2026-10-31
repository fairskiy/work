function checkClient(client) {
  if (!client || typeof client.request !== 'function') {
    throw new TypeError('client must implement request()');
  }
}

export class AuthProxy {
  constructor(client, strategy, refreshProvider = null) {
    checkClient(client);
    if (!strategy || typeof strategy.applyAuth !== 'function') {
      throw new TypeError('strategy must implement applyAuth()');
    }
    if (refreshProvider !== null && typeof refreshProvider !== 'function') {
      throw new TypeError('refreshProvider must be a function');
    }
    this.client = client;
    this.strategy = strategy;
    this.refreshProvider = refreshProvider;
    this.refreshPromise = null;
  }

  setStrategy(strategy) {
    if (!strategy || typeof strategy.applyAuth !== 'function') {
      throw new TypeError('strategy must implement applyAuth()');
    }
    this.strategy = strategy;
  }

  _withAuth(request) {
    const headers = new Headers(request.headers || {});
    this.strategy.applyAuth(headers);
    return { ...request, headers };
  }

  async refresh() {
    if (!this.refreshProvider) return false;
    if (!this.refreshPromise) {
      const strategy = this.strategy;
      this.refreshPromise = Promise.resolve().then(() => this.refreshProvider()).then(token => {
        if (typeof strategy.updateToken !== 'function') {
          throw new TypeError('strategy must implement updateToken() for refresh');
        }
        strategy.updateToken(token);
      }).finally(() => { this.refreshPromise = null; });
    }
    await this.refreshPromise;
    return true;
  }

  async request(request) {
    if (this.refreshPromise) await this.refreshPromise;
    let response = await this.client.request(this._withAuth(request));
    if (response.status === 401 && this.refreshProvider) {
      await this.refresh();
      response = await this.client.request(this._withAuth(request));
    }
    return response;
  }
}

export class RateLimitProxy {
  constructor(client, limitPerSecond = 5) {
    checkClient(client);
    if (!(Number.isFinite(limitPerSecond) && limitPerSecond > 0)) {
      throw new RangeError('limitPerSecond must be positive');
    }
    this.client = client;
    this.minInterval = 1000 / limitPerSecond;
    this.nextTime = 0;
    this.queue = Promise.resolve();
  }

  async request(request) {
    const turn = this.queue.then(async () => {
      const wait = Math.max(0, this.nextTime - Date.now());
      if (wait) await new Promise(res => setTimeout(res, wait));
      this.nextTime = Date.now() + this.minInterval;
    });
    this.queue = turn.catch(() => {});
    await turn;
    return this.client.request(request);
  }
}

export class LoggingProxy {
  constructor(client, logger = console) {
    checkClient(client);
    if (!logger || typeof logger.log !== 'function') {
      throw new TypeError('logger must implement log()');
    }
    this.client = client;
    this.logger = logger;
  }

  async request(request) {
    // Never log Authorization headers or credentials.
    this.logger.log(`[${new Date().toISOString()}] Request: ${request.method || 'GET'} ${request.url}`);
    try {
      const response = await this.client.request(request);
      this.logger.log(`[${new Date().toISOString()}] Response: ${response.status}`);
      return response;
    } catch (err) {
      this.logger.log(`[${new Date().toISOString()}] Error: ${err.message}`);
      throw err;
    }
  }
}
