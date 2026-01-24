import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateBearerToken, authenticateRequest } from "./auth.js";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("Authentication Middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateBearerToken", () => {
    it("should return true when API_TOKEN is not configured", () => {
      delete process.env.API_TOKEN;

      const request = {
        headers: {},
      } as FastifyRequest;

      expect(validateBearerToken(request)).toBe(true);
    });

    it("should return false when Authorization header is missing", () => {
      process.env.API_TOKEN = "test-token-123";

      const request = {
        headers: {},
      } as FastifyRequest;

      expect(validateBearerToken(request)).toBe(false);
    });

    it("should return false when Authorization scheme is not Bearer", () => {
      process.env.API_TOKEN = "test-token-123";

      const request = {
        headers: {
          authorization: "Basic dGVzdDp0ZXN0",
        },
      } as FastifyRequest;

      expect(validateBearerToken(request)).toBe(false);
    });

    it("should return false when token is missing after Bearer", () => {
      process.env.API_TOKEN = "test-token-123";

      const request = {
        headers: {
          authorization: "Bearer",
        },
      } as FastifyRequest;

      expect(validateBearerToken(request)).toBe(false);
    });

    it("should return false when token does not match", () => {
      process.env.API_TOKEN = "test-token-123";

      const request = {
        headers: {
          authorization: "Bearer wrong-token",
        },
      } as FastifyRequest;

      expect(validateBearerToken(request)).toBe(false);
    });

    it("should return true when token matches", () => {
      process.env.API_TOKEN = "test-token-123";

      const request = {
        headers: {
          authorization: "Bearer test-token-123",
        },
      } as FastifyRequest;

      expect(validateBearerToken(request)).toBe(true);
    });

    it("should handle tokens with special characters", () => {
      process.env.API_TOKEN = "test-token-!@#$%^&*()";

      const request = {
        headers: {
          authorization: "Bearer test-token-!@#$%^&*()",
        },
      } as FastifyRequest;

      expect(validateBearerToken(request)).toBe(true);
    });
  });

  describe("authenticateRequest", () => {
    it("should call reply.code(401) when token is invalid", async () => {
      process.env.API_TOKEN = "test-token-123";

      const request = {
        headers: {},
      } as FastifyRequest;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      await authenticateRequest(request, reply);

      expect(reply.code).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        error: "Unauthorized: Invalid or missing token",
      });
    });

    it("should not call reply when token is valid", async () => {
      process.env.API_TOKEN = "test-token-123";

      const request = {
        headers: {
          authorization: "Bearer test-token-123",
        },
      } as FastifyRequest;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      await authenticateRequest(request, reply);

      expect(reply.code).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });

    it("should not call reply when API_TOKEN is not configured", async () => {
      delete process.env.API_TOKEN;

      const request = {
        headers: {},
      } as FastifyRequest;

      const reply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      await authenticateRequest(request, reply);

      expect(reply.code).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });
  });
});
