import { describe, it, expect, beforeAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { versionRoutes } from '../routes/version.js';

describe('version routes', () => {
  let fastify: FastifyInstance;
  
  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(versionRoutes);
    await fastify.ready();
  });

  it('should return the version from package.json', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/version',
      headers: {
        'Authorization': 'Bearer any-token'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('version');
    expect(typeof body.version).toBe('string');
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should require authentication', async () => {
    process.env.API_TOKEN = 'test-token';
    
    const response = await fastify.inject({
      method: 'GET',
      url: '/version'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toBe('Unauthorized: Invalid or missing token');
  });
});