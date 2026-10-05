import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { type FakeFapiSeed, fapiUrl, serveFapi, worker } from '../../../__tests__/feature/fake-fapi';
import type { FapiAttributeOverrides } from '../../../__tests__/feature/fapi';
import { fapiClient, fapiEmailAddress, fapiEnvironment, fapiSession, fapiUser } from '../../../__tests__/feature/fapi';
import { renderWithClerk } from '../../../__tests__/feature/render';
import { UserProfileUsernameSection } from '../user-profile-username-section/user-profile-username-section';

function signedIn(username: string | null, attribute: FapiAttributeOverrides['username'] = {}): FakeFapiSeed {
  const user = fapiUser({ id: 'user_1', username, email_addresses: [fapiEmailAddress({ id: 'idn_email' })] });
  return {
    environment: fapiEnvironment({ attributes: { username: attribute } }),
    client: fapiClient([fapiSession({ id: 'sess_1', user })]),
  };
}

async function renderSection(seed: FakeFapiSeed) {
  const fapi = serveFapi(seed);
  const view = await renderWithClerk(<UserProfileUsernameSection />);
  return { ...view, fapi, actor: userEvent.setup() };
}

const section = () => screen.getByRole('group', { name: 'Username' });

describe('the user profile username section', () => {
  it('shows the username and saves an edited one', async () => {
    const { actor } = await renderSection(signedIn('alicesmith'));
    expect(section()).toHaveTextContent('alicesmith');

    await actor.click(within(section()).getByRole('button', { name: 'Edit username' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit username' });
    await actor.clear(within(dialog).getByLabelText('Username'));
    await actor.type(within(dialog).getByLabelText('Username'), 'alicia');
    await actor.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(section()).toHaveTextContent('alicia');
  });

  it('offers to set a username the user has not picked yet', async () => {
    await renderSection(signedIn(null));

    expect(within(section()).getByRole('button', { name: 'Add username' })).toBeInTheDocument();
  });

  it('keeps the dialog open on the error the server names it for', async () => {
    const { actor } = await renderSection(signedIn('alicesmith'));
    worker.use(
      http.post(fapiUrl('/v1/me'), () =>
        HttpResponse.json(
          {
            errors: [
              {
                code: 'form_identifier_exists',
                message: 'Taken',
                long_message: 'That username is taken. Please try another.',
                meta: { param_name: 'username' },
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    await actor.click(screen.getByRole('button', { name: 'Edit username' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit username' });
    await actor.type(within(dialog).getByLabelText('Username'), '2');
    await actor.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByText('That username is taken. Please try another.')).toBeInTheDocument();
  });

  it('is left out when the instance does not collect usernames', async () => {
    await renderSection(signedIn('alicesmith', { enabled: false }));

    expect(screen.queryByRole('group', { name: 'Username' })).not.toBeInTheDocument();
  });

  it('shows an immutable username without offering to change it', async () => {
    await renderSection(signedIn('alicesmith', { immutable: true }));

    expect(section()).toHaveTextContent('alicesmith');
    expect(screen.queryByRole('button', { name: 'Edit username' })).not.toBeInTheDocument();
  });

  it('is left out when the username is immutable and was never set', async () => {
    await renderSection(signedIn(null, { immutable: true }));

    expect(screen.queryByRole('group', { name: 'Username' })).not.toBeInTheDocument();
  });
});

describe('username reverification', () => {
  it.todo('confirms it is the user before the username changes');
});
