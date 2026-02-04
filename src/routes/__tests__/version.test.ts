import { describe, it, expect, beforeAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { versionRoutes } from '../version.js';

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
      url: '/version'
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

    // With API_TOKEN set, should get 401 without token
    expect(response.statusCode).toBe(401);
  });
});