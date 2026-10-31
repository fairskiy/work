// Basic HTTP client without authentication logic.
export class BaseHttpClient {
  constructor(requestHandler = globalThis.fetch) {
    if (typeof requestHandler !== 'function') throw new TypeError('requestHandler must be a function');
    this.requestHandler = requestHandler;
  }

  async request(request) {
    if (!request || typeof request.url !== 'string') throw new TypeError('request.url must be a string');
    const { url, ...options } = request;
    return this.requestHandler(url, options);
  }
}
