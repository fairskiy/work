export class GitHubService {
  constructor(client) {
    if (!client || typeof client.request !== 'function') {
      throw new TypeError('client must implement request()');
    }
    this.client = client;
  }

  async getUser(username) {
    return this.client.request({
      url: `https://api.github.com/users/${encodeURIComponent(username)}`,
      method: 'GET'
    });
  }
}
