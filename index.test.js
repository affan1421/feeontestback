const request = require('supertest');
const app = require('./index');

describe('GET /', () => {
  it('responds with "Servers is Running"', async () => {
    const response = await request(app).get('/');
    expect(response.text).toEqual('Server is Running');
  });
});
