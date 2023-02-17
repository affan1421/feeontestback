const request = require('supertest');
const app = require('./index');

describe('GET /', () => {
  it('responds with "Servers is successful"', async () => {
    const response = await request(app).get('/');
    expect(response.text).toEqual('Servers is successful');
  });
});
