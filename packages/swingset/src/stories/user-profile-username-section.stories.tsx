import { UserProfileUsernameSectionView } from '@clerk/mosaic/features/user-profile/user-profile-username-section/user-profile-username-section.view';
import type { FormError } from '@clerk/mosaic/utils/form-error';

import type { StoryMeta } from '@/lib/types';

import { useUserProfileEditUsernameFixture } from './fixtures/user-profile-edit-username';

export { default as __source } from './user-profile-username-section.stories?raw';

export const meta: StoryMeta = {
  group: 'User Profile',
  status: 'wip',
  title: 'UserProfileUsernameSection',
  label: 'Username',
  navigation: { category: 'Sections' },
  source:
    'packages/mosaic/src/features/user-profile/user-profile-username-section/user-profile-username-section.view.tsx',
};

function UsernameSection({ failWith }: { failWith?: FormError }) {
  const editUsername = useUserProfileEditUsernameFixture({ failWith });

  return (
    <UserProfileUsernameSectionView
      username={editUsername.username}
      onSubmit={editUsername.onSubmitUsername}
    />
  );
}

export function Default() {
  return <UsernameSection />;
}

export function EditUsernameFails() {
  return (
    <UsernameSection
      failWith={{
        global: { message: 'Your username could not be updated.' },
        fields: { username: { message: 'That username is already taken.' } },
      }}
    />
  );
}
