import { beforeEach, describe, expect, it, vi } from 'vitest';
import { identifyByImageUrls, uploadIdentifyImages } from '@/components/identify/imageLookup';

const { uploadFileMock, invokeLLMMock } = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  invokeLLMMock: vi.fn(),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    integrations: {
      Core: {
        UploadFile: uploadFileMock,
        InvokeLLM: invokeLLMMock,
      },
    },
  },
}));

describe('imageLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws actionable error for unsupported file types', async () => {
    const file = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });
    await expect(uploadIdentifyImages([file])).rejects.toMatchObject({
      code: 'UNSUPPORTED_FILE_TYPE',
    });
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it('returns low-confidence fallback for malformed AI response', async () => {
    invokeLLMMock.mockResolvedValue('invalid-json-shape');
    const result = await identifyByImageUrls(['https://cdn.example.com/pipe.jpg'], 'pipe');
    expect(result.confidence).toBe('low');
    expect(result.fallback).toBe(true);
    expect(result.fallbackMessage).toMatch(/malformed/i);
  });
});
