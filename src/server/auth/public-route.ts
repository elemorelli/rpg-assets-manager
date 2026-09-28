declare module "fastify" {
  interface FastifyContextConfig {
    isPublic?: boolean;
  }
}

// Pass as route options to skip the session check, e.g. app.get(path, PUBLIC_ROUTE_OPTIONS, handler).
export const PUBLIC_ROUTE_OPTIONS = { config: { isPublic: true } };
