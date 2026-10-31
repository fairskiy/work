export class JwtStrategy {
  constructor(token) { this.token = token; }
  applyAuth(headers) { headers.set('Authorization', `Bearer ${this.token}`); }
  updateToken(token) { this.token = token; }
}

export class OAuthStrategy {
  constructor(accessToken) { this.accessToken = accessToken; }
  applyAuth(headers) { headers.set('Authorization', `Bearer ${this.accessToken}`); }
  updateToken(token) { this.accessToken = token; }
}

export class ApiKeyStrategy {
  constructor(key, headerName = 'X-API-Key') {
    this.key = key;
    this.headerName = headerName;
  }
  applyAuth(headers) { headers.set(this.headerName, this.key); }
  updateToken(key) { this.key = key; }
}
