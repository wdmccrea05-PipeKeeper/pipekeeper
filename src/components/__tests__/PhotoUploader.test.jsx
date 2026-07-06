import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PhotoUploader from '@/components/PhotoUploader';

const { uploadFileMock, toastErrorMock } = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    integrations: {
      Core: {
        UploadFile: uploadFileMock,
      },
    },
  },
}));

vi.mock('@/components/i18n/safeTranslation', () => ({
  useTranslation: () => ({ t: (_key, fallback) => fallback || '' }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock('@/components/pipes/ImageCropper', () => ({
  default: function MockImageCropper({ onSave, onCancel }) {
    return (
      <div data-testid="image-cropper">
        <button type="button" onClick={() => onSave('data:image/jpeg;base64,Zm9v')}>
          save-crop
        </button>
        <button type="button" onClick={onCancel}>
          cancel-crop
        </button>
      </div>
    );
  },
}));

describe('PhotoUploader', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: async () => new Blob(['photo'], { type: 'image/jpeg' }),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('keeps cropper open when upload fails so selected image is preserved', async () => {
    uploadFileMock.mockRejectedValueOnce(new Error('upload failed'));

    render(<PhotoUploader onPhotosSelected={vi.fn()} existingPhotos={[]} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByTestId('image-cropper')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'save-crop' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(screen.getByTestId('image-cropper')).toBeTruthy();
  });
});