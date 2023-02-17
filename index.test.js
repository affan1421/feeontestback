const request = require('supertest');
const app = require('./index');

describe('GET /', () => {
  it('responds with "Server is up and Running👨‍💻👩‍💻"', async () => {
    const response = await request(app).get('/');
    expect(response.text).toEqual('Server is up and Running👨‍💻👩‍💻');
  });
});
