import { UserProfileProfileSectionView } from '@clerk/mosaic/features/user-profile/user-profile-profile-section/user-profile-profile-section.view';
import type { FormError } from '@clerk/mosaic/utils/form-error';

import type { StoryMeta } from '@/lib/types';

import { usePreviewImage } from './fixtures/use-preview-image';
import { useUserProfileEditNameFixture } from './fixtures/user-profile-edit-name';

export { default as __source } from './user-profile-profile-section.stories?raw';

export const meta: StoryMeta = {
  group: 'User Profile',
  status: 'wip',
  title: 'UserProfileProfileSection',
  label: 'Profile',
  navigation: { category: 'Sections' },
  source:
    'packages/mosaic/src/features/user-profile/user-profile-profile-section/user-profile-profile-section.view.tsx',
};

function ProfileSection({ failWith, nameManagedBy }: { failWith?: FormError; nameManagedBy?: { name: string } }) {
  const editName = useUserProfileEditNameFixture({ failWith });
  const { imageUrl, showFile, clearImage } = usePreviewImage('https://avatars.githubusercontent.com/u/51144033?v=4');

  return (
    <UserProfileProfileSectionView
      {...editName}
      hasImage={Boolean(imageUrl)}
      imageUrl={imageUrl}
      nameManagedBy={nameManagedBy}
      onSubmitName={nameManagedBy ? undefined : editName.onSubmitName}
      onProfilePictureChange={showFile}
      onRemoveProfilePicture={clearImage}
    />
  );
}

export function Default() {
  return <ProfileSection />;
}

/**
 * An enterprise connection owns the name, so the row names who manages it in place of an edit
 * action.
 */
export function NameManagedByConnection() {
  return <ProfileSection nameManagedBy={{ name: 'Okta' }} />;
}

/** Every save is rejected, so the dialog shows both halves of a failure at once. */
export function EditNameFails() {
  return (
    <ProfileSection
      failWith={{
        global: { message: 'Your name could not be updated.' },
        fields: { lastName: { message: 'Last name must be 64 characters or fewer.' } },
      }}
    />
  );
}
