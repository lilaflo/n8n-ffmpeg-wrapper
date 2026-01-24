import { FastifyRequest, FastifyReply } from "fastify";

/**
 * Validates Bearer token from Authorization header
 * @returns true if token is valid, false otherwise
 */
export function validateBearerToken(request: FastifyRequest): boolean {
  const API_TOKEN = process.env.API_TOKEN;

  if (!API_TOKEN) {
    console.debug("Warning: API_TOKEN not configured, authentication disabled");
    return true; // Allow all requests if token not configured (dev mode)
  }

  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return false;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return false;
  }

  return token === API_TOKEN;
}

/**
 * Fastify hook to check authentication before route handlers
 * Returns 401 if authentication fails
 */
export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!validateBearerToken(request)) {
    reply.code(401).send({ error: "Unauthorized: Invalid or missing token" });
  }
}
