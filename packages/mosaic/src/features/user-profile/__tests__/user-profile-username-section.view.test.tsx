import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MosaicProvider } from '../../../mosaic-provider';
import { UserProfileUsernameSectionView } from '../user-profile-username-section/user-profile-username-section.view';

describe('UserProfileUsernameSectionView', () => {
  it('offers to add a username the user does not have yet', async () => {
    const user = userEvent.setup();
    render(
      <MosaicProvider>
        <UserProfileUsernameSectionView
          username=''
          onSubmit={vi.fn()}
        />
      </MosaicProvider>,
    );

    expect(screen.getByText('No username added')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add username' }));
    expect(screen.getByRole('dialog', { name: 'Add username' })).toBeInTheDocument();
  });

  it('offers to edit a username the user has', async () => {
    const user = userEvent.setup();
    render(
      <MosaicProvider>
        <UserProfileUsernameSectionView
          username='prestonxyz'
          onSubmit={vi.fn()}
        />
      </MosaicProvider>,
    );

    expect(screen.getByText('prestonxyz')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit username' }));
    expect(screen.getByRole('dialog', { name: 'Edit username' })).toBeInTheDocument();
  });

  it('submits the edited username from a dialog seeded with the saved one', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve());
    render(
      <MosaicProvider>
        <UserProfileUsernameSectionView
          username='prestonxyz'
          onSubmit={onSubmit}
        />
      </MosaicProvider>,
    );

    expect(screen.getByRole('group', { name: 'Username' })).toHaveTextContent('prestonxyz');
    await user.click(screen.getByRole('button', { name: 'Edit username' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit username' });
    expect(within(dialog).getByLabelText('Username')).toHaveValue('prestonxyz');
    await user.clear(within(dialog).getByLabelText('Username'));
    await user.type(within(dialog).getByLabelText('Username'), 'preston');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith('preston');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
