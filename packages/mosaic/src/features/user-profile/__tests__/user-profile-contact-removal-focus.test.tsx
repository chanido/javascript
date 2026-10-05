import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { MosaicProvider } from '../../../mosaic-provider';
import { UserProfileEmailSectionView } from '../user-profile-email-section/user-profile-email-section.view';
import { UserProfilePhoneSectionView } from '../user-profile-phone-section/user-profile-phone-section.view';

describe('contact removal focus', () => {
  it.each(['email', 'phone'] as const)('focuses the remaining %s menu and the empty group without Add', async kind => {
    const user = userEvent.setup();
    const values = kind === 'email' ? ['first@example.com', 'second@example.com'] : ['+18015550100', '+18015550200'];
    const labels = kind === 'email' ? values : ['+1 (801) 555-0100', '+1 (801) 555-0200'];

    function Example() {
      const [items, setItems] = useState(
        values.map(value => ({ id: value, value, isDefault: false, isVerified: true })),
      );
      const remove = (id: string) => setItems(current => current.filter(item => item.id !== id));
      return (
        <MosaicProvider>
          {kind === 'email' ? (
            <UserProfileEmailSectionView
              emails={items}
              onRemoveEmail={remove}
            />
          ) : (
            <UserProfilePhoneSectionView
              phones={items}
              onRemovePhone={remove}
            />
          )}
        </MosaicProvider>
      );
    }

    render(<Example />);
    for (const [removed, focused] of [
      [0, 1],
      [1, undefined],
    ] as const) {
      await user.click(screen.getByRole('button', { name: `Manage ${labels[removed]}` }));
      await user.click(
        screen.getByRole('menuitem', { name: kind === 'email' ? 'Remove email' : 'Remove phone number' }),
      );
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      if (focused !== undefined) {
        await waitFor(() => expect(screen.getByRole('button', { name: `Manage ${labels[focused]}` })).toHaveFocus());
      } else {
        expect(screen.getByRole('group', { name: kind === 'email' ? 'Email' : 'Phone' })).toHaveFocus();
      }
    }
  });
});
