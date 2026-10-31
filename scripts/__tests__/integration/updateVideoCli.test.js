import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { main } from '../../updateVideoData.js';
import { generateVideosList } from '../../generateVideosList.js';
import { generateSidebarData } from '../../generateSidebarData.js';

const { logger } = vi.hoisted(() => ({
  logger: { log: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}));
vi.mock('../../debug.js', () => ({
  createNamespacedLogger: () => logger,
  createChildLogger: () => logger
}));
vi.mock('../../generateVideosList.js', () => ({ generateVideosList: vi.fn() }));
vi.mock('../../generateSidebarData.js', () => ({ generateSidebarData: vi.fn() }));

describe('Update video CLI', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('YOUTUBE_API_KEY', 'test-api-key');
    vi.spyOn(process, 'exit').mockImplementation(() => {});
    fs.existsSync.mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true,
      json: async () => ({
        items: url.includes('/videos?') ? [{
          snippet: {
            title: 'Test video',
            description: '0:00 Intro\n1:00 Test song',
            publishedAt: '2023-01-01T00:00:00Z',
            thumbnails: { default: { url: 'https://example.com/thumbnail.jpg' } }
          }
        }] : []
      })
    })));
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    { args: ['AZ6KhfbTPDk'], videoId: 'AZ6KhfbTPDk', useUserComment: false },
    { args: ['-_IJmq8xm0A'], videoId: '-_IJmq8xm0A', useUserComment: false },
    { args: ['--IJmq8xm0A'], videoId: '--IJmq8xm0A', useUserComment: false },
    {
      args: ['--user-comment', '-_IJmq8xm0A'],
      videoId: '-_IJmq8xm0A',
      useUserComment: true
    },
    {
      args: ['-_IJmq8xm0A', '--user-comment'],
      videoId: '-_IJmq8xm0A',
      useUserComment: true
    },
    { args: ['--', '-_IJmq8xm0A'], videoId: '-_IJmq8xm0A', useUserComment: false },
    {
      args: ['--user-comment', '--', '-_IJmq8xm0A'],
      videoId: '-_IJmq8xm0A',
      useUserComment: true
    },
    {
      args: ['-_IJmq8xm0A', '--', '--user-comment'],
      videoId: '-_IJmq8xm0A',
      useUserComment: false
    }
  ])('fetches and saves the unchanged video ID for $args', async ({
    args, videoId, useUserComment
  }) => {
    process.argv = ['node', 'scripts/updateVideoData.js', ...args];

    await main();

    expect(process.exit).not.toHaveBeenCalled();
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get('id')).toBe(videoId);
    expect(fetch).toHaveBeenCalledTimes(useUserComment ? 2 : 1);
    if (useUserComment) {
      expect(new URL(fetch.mock.calls[1][0]).searchParams.get('videoId')).toBe(videoId);
    }

    const videoPath = path.join(process.cwd(), 'public', 'videos', `${videoId}.json`);
    const videoWrite = fs.writeFileSync.mock.calls.find(([filePath]) => filePath === videoPath);
    expect(videoWrite).toBeDefined();
    expect(JSON.parse(videoWrite[1])).toMatchObject({ video_id: videoId });
    expect(generateVideosList).toHaveBeenCalledOnce();
    expect(generateSidebarData).toHaveBeenCalledOnce();
  });

  it.each([
    { args: [] },
    { args: ['--user-comment'] },
    { args: ['--'] },
    { args: ['--user-comment', '--'] }
  ])(
    'rejects missing video IDs for $args',
    async ({ args }) => {
      process.argv = ['node', 'scripts/updateVideoData.js', ...args];

      await main();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Error:',
        expect.objectContaining({ message: 'Video ID is required as a command line argument' })
      );
      expect(fetch).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(generateVideosList).not.toHaveBeenCalled();
      expect(generateSidebarData).not.toHaveBeenCalled();
    }
  );
});
