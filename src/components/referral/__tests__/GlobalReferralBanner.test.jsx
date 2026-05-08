import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockNavigate = vi.fn();
const mockInvoke = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { email: 'tester@example.com' },
    isLoading: false,
  }),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    functions: {
      invoke: (...args) => mockInvoke(...args),
    },
  },
}));

import GlobalReferralBanner from '@/components/referral/GlobalReferralBanner';

describe('GlobalReferralBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockReset();
    mockInvoke.mockResolvedValue({ data: { earnedAccess: [] } });
  });

  it('renders banner content for active users', async () => {
    render(<GlobalReferralBanner />);

    expect(await screen.findByText('Invite Friends. Earn Pro Time.')).toBeInTheDocument();
    expect(screen.getByText("Don't show again")).toBeInTheDocument();
  });

  it("persists permanent dismissal when 'Don't show again' is selected", async () => {
    const { unmount } = render(<GlobalReferralBanner />);

    const checkbox = await screen.findByLabelText("Don't show again");
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(localStorage.getItem('pk_referral_banner_dismissed_forever_global')).toBe('1');
    expect(localStorage.getItem('pk_referral_banner_dismissed_forever_user:tester@example.com')).toBe('1');

    unmount();
    render(<GlobalReferralBanner />);

    await waitFor(() => {
      expect(screen.queryByText('Invite Friends. Earn Pro Time.')).not.toBeInTheDocument();
    });
  });
});
