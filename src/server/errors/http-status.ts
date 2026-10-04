export const HTTP_STATUS = {
  ok: 200,
  badRequest: 400,
  unauthorized: 401,
  notFound: 404,
  conflict: 409,
  payloadTooLarge: 413,
  badGateway: 502,
  gatewayTimeout: 504,
} as const;
