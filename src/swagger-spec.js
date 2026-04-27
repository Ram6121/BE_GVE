/** OpenAPI 3 spec for Swagger UI */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'GEV ICMS API',
    version: '1.0.0',
    description: 'Integrated campus management — auth, persons (VMS), gate / QR.',
  },
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Persons' },
    { name: 'Gate' },
  ],
  servers: [{ url: '/', description: 'This server' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { type: 'object' },
        },
      },
      Person: {
        type: 'object',
        additionalProperties: true,
      },
      ScanRequest: {
        type: 'object',
        required: ['qr_id', 'gate'],
        properties: {
          qr_id: { type: 'string', format: 'uuid' },
          gate: {
            type: 'string',
            enum: ['main_gate', 'gate_7', 'sbt_gate', 'exit_gate'],
          },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    system: { type: 'string' },
                    version: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'JWT issued',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          400: { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User row' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/persons': {
      get: {
        tags: ['Persons'],
        summary: 'List persons',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: { description: 'List' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Persons'],
        summary: 'Create person',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['full_name', 'person_type', 'mobile'],
                properties: {
                  full_name: { type: 'string' },
                  person_type: { type: 'string' },
                  mobile: { type: 'string' },
                  dept_id: { type: 'integer' },
                  id_proof_type: { type: 'string' },
                  id_proof_number: { type: 'string' },
                  date_of_birth: { type: 'string', format: 'date' },
                  gender: { type: 'string' },
                  perm_address: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  pincode: { type: 'string' },
                  accommodation_block: { type: 'string' },
                  room_number: { type: 'string' },
                  registration_source: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/persons/{id}': {
      get: {
        tags: ['Persons'],
        summary: 'Get person by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Person' },
          404: { description: 'Not found' },
          401: { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Persons'],
        summary: 'Update person',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string' },
                  mobile: { type: 'string' },
                  dept_id: { type: 'integer' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated' },
          404: { description: 'Not found' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/gate/scan': {
      post: {
        tags: ['Gate'],
        summary: 'Scan QR at gate',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ScanRequest' },
            },
          },
        },
        responses: {
          200: { description: 'allow / deny payload' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/gate/stats': {
      get: {
        tags: ['Gate'],
        summary: "Today's gate stats",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Per-gate counts' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/gate/batch': {
      post: {
        tags: ['Gate'],
        summary: 'Festival batch entry',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['gate', 'count'],
                properties: {
                  gate: { type: 'string' },
                  count: { type: 'integer' },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OK' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/gate/override': {
      post: {
        tags: ['Gate'],
        summary: 'Manual gate override (admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['gate', 'reason'],
                properties: {
                  gate: { type: 'string' },
                  person_id: { type: 'integer' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Logged' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/gate/image/{qr_id}': {
      get: {
        tags: ['Gate'],
        summary: 'QR code PNG (public)',
        parameters: [{ name: 'qr_id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'PNG image',
            content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
          },
        },
      },
    },
  },
};
