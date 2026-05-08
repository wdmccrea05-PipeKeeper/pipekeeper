import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FlavorProfileField from '@/components/tobacco/FlavorProfileField';

function renderField(initialValue = []) {
  function Harness() {
    const [value, setValue] = useState(initialValue);
    return (
      <FlavorProfileField
        value={value}
        onChange={setValue}
        commonNotes={['Earthy', 'Sweet', 'Nutty']}
        description="Select or enter flavor notes you detect in this blend"
      />
    );
  }

  return render(<Harness />);
}

describe('FlavorProfileField', () => {
  it('renders the custom input', () => {
    renderField();
    expect(screen.getByPlaceholderText('Add custom flavor note…')).toBeInTheDocument();
  });

  it('adds a custom flavor when Enter is pressed', () => {
    renderField();
    const input = screen.getByPlaceholderText('Add custom flavor note…');

    fireEvent.change(input, { target: { value: '  Molasses ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('Molasses')).toBeInTheDocument();
  });

  it('adds a custom flavor when Add is tapped', () => {
    renderField();

    fireEvent.change(screen.getByPlaceholderText('Add custom flavor note…'), {
      target: { value: 'Brown Sugar' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Brown Sugar')).toBeInTheDocument();
  });

  it('ignores duplicate custom flavors case-insensitively', () => {
    renderField();
    const input = screen.getByPlaceholderText('Add custom flavor note…');

    fireEvent.change(input, { target: { value: 'Molasses' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    fireEvent.change(input, { target: { value: 'molasses' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getAllByText('Molasses')).toHaveLength(1);
  });

  it('allows removing a custom flavor chip', () => {
    renderField(['Molasses']);

    fireEvent.click(screen.getByRole('button', { name: 'Remove flavor note Molasses' }));

    expect(screen.queryByText('Molasses')).not.toBeInTheDocument();
  });

  it('keeps predefined chips working', () => {
    renderField();

    fireEvent.click(screen.getByRole('button', { name: 'Earthy' }));

    expect(screen.getByRole('button', { name: 'Remove flavor note Earthy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Earthy' }).className).toContain('bg-amber-600');
  });

  it('uses mobile-friendly classes without horizontal overflow', () => {
    renderField(['Earthy']);

    const field = screen.getByTestId('flavor-profile-field');
    expect(field.className).toContain('overflow-x-hidden');

    const input = screen.getByPlaceholderText('Add custom flavor note…');
    expect(input.className).toContain('min-h-11');
    expect(input.className).toContain('w-full');
    expect(input.className).toContain('min-w-0');

    const addButton = screen.getByRole('button', { name: 'Add' });
    expect(addButton.className).toContain('min-h-11');
    expect(addButton.className).toContain('w-full');

    const selectedNotesGroup = screen.getByText('Selected notes').parentElement;
    expect(within(selectedNotesGroup).getByText('Earthy')).toBeInTheDocument();
    expect(selectedNotesGroup.querySelector('.flex-wrap')).toBeTruthy();
  });
});

