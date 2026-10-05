import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MosaicProvider } from '../../../mosaic-provider';
import type { UserProfileProfileSectionViewProps } from '../user-profile-profile-section/user-profile-profile-section.view';
import { UserProfileProfileSectionView } from '../user-profile-profile-section/user-profile-profile-section.view';

function renderView(overrides: Partial<UserProfileProfileSectionViewProps> = {}) {
  return render(
    <MosaicProvider>
      <UserProfileProfileSectionView
        name='Preston Booth'
        {...overrides}
      />
    </MosaicProvider>,
  );
}

function filePicker(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) {
    throw new Error('File picker not found');
  }
  return input;
}

const oversized = () => new File([new Uint8Array(10 * 1000 * 1000 + 1)], 'big.png', { type: 'image/png' });

describe('UserProfileProfileSectionView', () => {
  it('groups the picture and name under Profile', () => {
    renderView({ onProfilePictureChange: vi.fn(() => Promise.resolve()), onSubmitName: () => Promise.resolve() });

    const group = screen.getByRole('group', { name: 'Profile' });
    expect(within(group).getByRole('heading', { name: 'Profile' })).toHaveClass('cl-section-title');
    expect(within(group).getByText('Profile picture', { selector: '.cl-section-label > *' })).toBeInTheDocument();
    expect(within(group).getByText('Recommend size 1:1, up to 10MB.')).toHaveClass('cl-section-description');
    expect(within(group).getByText('Name', { selector: '.cl-section-label > *' })).toBeInTheDocument();
    expect(within(group).getByText('Preston Booth')).toHaveClass('cl-section-description');
    expect(within(group).getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Edit name' })).toBeInTheDocument();
    const picture = screen.getByText('Profile picture').closest('.cl-section-item');
    expect(picture?.querySelector('.cl-section-media')).toHaveAttribute('data-size', 'lg');
    expect(picture?.querySelector('.cl-avatar')).toHaveAttribute('data-size', 'fit');
  });

  it('leaves out the name row when neither name attribute is enabled', () => {
    renderView({
      firstNameAttribute: { enabled: false, required: false },
      lastNameAttribute: { enabled: false, required: false },
    });

    expect(screen.getByText('Profile picture')).toBeInTheDocument();
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
  });

  it('uploads the picked file when no profile picture is set', async () => {
    const user = userEvent.setup();
    const onProfilePictureChange = vi.fn(() => Promise.resolve());
    const { container } = renderView({
      onProfilePictureChange,
      onRemoveProfilePicture: vi.fn(() => Promise.resolve()),
    });

    expect(screen.queryByRole('button', { name: 'Manage profile picture' })).toBeNull();
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await user.upload(filePicker(container), file);

    expect(onProfilePictureChange).toHaveBeenCalledWith(file);
  });

  it('turns away a file past the size the row advertises', async () => {
    const user = userEvent.setup();
    const onProfilePictureChange = vi.fn(() => Promise.resolve());
    const onProfilePictureReject = vi.fn();
    const { container } = renderView({ onProfilePictureChange, onProfilePictureReject });

    const file = oversized();
    await user.upload(filePicker(container), file);

    expect(onProfilePictureChange).not.toHaveBeenCalled();
    expect(onProfilePictureReject).toHaveBeenCalledWith([{ file, reason: 'size' }]);
    expect(screen.getByRole('alert')).toHaveTextContent('File size exceeds the maximum limit of 10MB.');
    expect(screen.getByText('Recommend size 1:1, up to 10MB.')).toBeInTheDocument();
  });

  it('clears the rejection once an acceptable file is picked', async () => {
    const user = userEvent.setup();
    const { container } = renderView({ onProfilePictureChange: vi.fn(() => Promise.resolve()) });

    await user.upload(filePicker(container), oversized());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.upload(filePicker(container), new File(['small'], 'small.png', { type: 'image/png' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('submits the edited name from a dialog seeded with the saved name', async () => {
    const user = userEvent.setup();
    const onSubmitName = vi.fn(() => Promise.resolve());
    renderView({ firstName: 'Preston', lastName: 'Booth', onSubmitName });

    await user.click(screen.getByRole('button', { name: 'Edit name' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit name' });
    expect(within(dialog).getByLabelText('First name')).toHaveValue('Preston');
    expect(within(dialog).getByLabelText('Last name')).toHaveValue('Booth');

    await user.clear(within(dialog).getByLabelText('Last name'));
    await user.type(within(dialog).getByLabelText('Last name'), 'Barton');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(onSubmitName).toHaveBeenCalledWith({ firstName: 'Preston', lastName: 'Barton' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
