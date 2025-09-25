import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_SECRET = 'test-secret';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    component: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(JSON.stringify({
            componentType: 'MUIButton',
            componentName: 'TestButton',
            propsSchema: { props: [] },
            code: 'export default function TestButton() { return <button>Test</button>; }',
          })),
        },
      }),
    }),
  })),
}));

// Mock esbuild
jest.mock('esbuild', () => ({
  build: jest.fn().mockResolvedValue({
    outputFiles: [{
      text: 'console.log("bundled code");',
    }],
  }),
}));

// Mock file system operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('file content'),
  mkdir: jest.fn().mockResolvedValue(undefined),
  mkdtemp: jest.fn().mockResolvedValue('/tmp/test-dir'),
  rm: jest.fn().mockResolvedValue(undefined),
}));

// Mock axe-core
jest.mock('axe-core', () => ({
  run: jest.fn().mockResolvedValue({
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: [],
  }),
}));

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error:'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
