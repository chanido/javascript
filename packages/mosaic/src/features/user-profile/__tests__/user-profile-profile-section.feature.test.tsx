import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { type FakeFapiSeed, fapiUrl, serveFapi, worker } from '../../../__tests__/feature/fake-fapi';
import {
  fapiClient,
  fapiEmailAddress,
  fapiEnterpriseAccount,
  fapiEnvironment,
  fapiSession,
  fapiUser,
} from '../../../__tests__/feature/fapi';
import { renderWithClerk } from '../../../__tests__/feature/render';
import { UserProfileProfileSection } from '../user-profile-profile-section/user-profile-profile-section';

function signedIn(environment = fapiEnvironment()): FakeFapiSeed {
  const user = fapiUser({
    id: 'user_1',
    first_name: 'Alice',
    last_name: 'Smith',
    email_addresses: [fapiEmailAddress({ id: 'idn_email' })],
  });
  return { environment, client: fapiClient([fapiSession({ id: 'sess_1', user })]) };
}

async function renderSection(seed: FakeFapiSeed = signedIn()) {
  const fapi = serveFapi(seed);
  const view = await renderWithClerk(<UserProfileProfileSection />);
  return { ...view, fapi, actor: userEvent.setup() };
}

function fileInput(container: Element): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('expected a file input');
  }
  return input;
}

function failsWith(path: string, error: Record<string, unknown>, status: number) {
  worker.use(http.post(fapiUrl(path), () => HttpResponse.json({ errors: [error] }, { status })));
}

describe('the user profile profile section', () => {
  it('names the section and shows the full name', async () => {
    await renderSection();

    expect(within(screen.getByRole('group', { name: 'Profile' })).getByText('Alice Smith')).toBeInTheDocument();
  });

  it('saves an edited name and closes the dialog', async () => {
    const { actor } = await renderSection();

    await actor.click(screen.getByRole('button', { name: 'Edit name' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit name' });
    await actor.clear(within(dialog).getByLabelText('First name'));
    await actor.type(within(dialog).getByLabelText('First name'), 'Alicia');
    await actor.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Alicia Smith')).toBeInTheDocument();
  });

  it('leaves the name out when the instance collects neither half of it', async () => {
    await renderSection(
      signedIn(fapiEnvironment({ attributes: { first_name: { enabled: false }, last_name: { enabled: false } } })),
    );

    expect(screen.getByRole('group', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit name' })).not.toBeInTheDocument();
  });

  it('uploads a picked picture and then offers to change or remove it', async () => {
    const { actor, container } = await renderSection();

    expect(screen.queryByRole('button', { name: 'Manage profile picture' })).not.toBeInTheDocument();
    await actor.upload(fileInput(container), new File(['x'], 'me.png', { type: 'image/png' }));

    await actor.click(await screen.findByRole('button', { name: 'Manage profile picture' }));
    expect(await screen.findByRole('menuitem', { name: 'Remove avatar' })).toBeInTheDocument();
  });

  it('says why an upload was refused', async () => {
    const { actor, container } = await renderSection();
    failsWith('/v1/me/profile_image', { code: 'avatar_file_size_exceeded', message: 'Too large' }, 413);

    await actor.upload(fileInput(container), new File(['x'], 'me.png', { type: 'image/png' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'File size exceeds the maximum limit of 10MB. Please choose a smaller file.',
    );
  });

  it('hands the name to an active enterprise connection instead of offering to edit it', async () => {
    const user = fapiUser({
      id: 'user_1',
      first_name: 'Alice',
      last_name: 'Smith',
      email_addresses: [fapiEmailAddress({ id: 'idn_primary', email_address: 'alice@acme.co' })],
      enterprise_accounts: [
        fapiEnterpriseAccount({ id: 'eac_1', email_address: 'alice@acme.co' }, { name: 'Acme Corp' }),
      ],
    });
    await renderSection({
      environment: fapiEnvironment({
        user_settings: {
          enterprise_sso: { enabled: true, self_serve_sso: false, self_serve_directory_sync: false },
        },
      }),
      client: fapiClient([fapiSession({ id: 'sess_1', user })]),
    });

    expect(await screen.findByText('Managed by Acme Corp')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit name' })).not.toBeInTheDocument();
  });

  it('shows the newly active account and drops the draft the other one left open', async () => {
    const alice = fapiUser({
      id: 'user_1',
      first_name: 'Alice',
      last_name: 'Smith',
      email_addresses: [fapiEmailAddress({ id: 'idn_alice' })],
    });
    const bob = fapiUser({
      id: 'user_2',
      first_name: 'Bob',
      last_name: 'Jones',
      email_addresses: [fapiEmailAddress({ id: 'idn_bob' })],
    });
    const { actor, clerk } = await renderSection({
      environment: fapiEnvironment(),
      client: fapiClient([fapiSession({ id: 'sess_1', user: alice }), fapiSession({ id: 'sess_2', user: bob })]),
    });

    await actor.click(screen.getByRole('button', { name: 'Edit name' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit name' });
    await actor.clear(within(dialog).getByLabelText('First name'));
    await actor.type(within(dialog).getByLabelText('First name'), 'Alicia');

    await act(() => clerk.setActive({ session: 'sess_2' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByText(/Alic/)).not.toBeInTheDocument();
  });
});
