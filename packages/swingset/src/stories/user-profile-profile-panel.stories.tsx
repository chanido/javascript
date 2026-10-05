import { UserProfileConnectedAccountsSectionView } from '@clerk/mosaic/features/user-profile/user-profile-connected-accounts-section/user-profile-connected-accounts-section.view';
import { UserProfileEmailSectionView } from '@clerk/mosaic/features/user-profile/user-profile-email-section/user-profile-email-section.view';
import { UserProfilePhoneSectionView } from '@clerk/mosaic/features/user-profile/user-profile-phone-section/user-profile-phone-section.view';
import { UserProfileProfilePanelView } from '@clerk/mosaic/features/user-profile/user-profile-profile-panel.view';
import { UserProfileProfileSectionView } from '@clerk/mosaic/features/user-profile/user-profile-profile-section/user-profile-profile-section.view';
import { UserProfileUsernameSectionView } from '@clerk/mosaic/features/user-profile/user-profile-username-section/user-profile-username-section.view';
import { UserProfileWeb3WalletsSectionView } from '@clerk/mosaic/features/user-profile/user-profile-web3-wallets-section.view';
import { useRef } from 'react';

import type { StoryMeta } from '@/lib/types';

import { usePreviewImage } from './fixtures/use-preview-image';
import { UserProfileDangerPreview } from './fixtures/user-profile';
import { useConnectedAccountsFixture } from './fixtures/user-profile-connected-accounts';
import { useUserProfileEditNameFixture } from './fixtures/user-profile-edit-name';
import { useUserProfileEditUsernameFixture } from './fixtures/user-profile-edit-username';
import { useUserProfileEmailsFixture } from './fixtures/user-profile-emails';
import { useUserProfilePhonesFixture } from './fixtures/user-profile-phones';
import { useWeb3WalletsFixture } from './fixtures/user-profile-web3-wallets';

const profileImageUrl = 'https://avatars.githubusercontent.com/u/51144033?v=4';

export { default as __source } from './user-profile-profile-panel.stories?raw';

export const meta: StoryMeta = {
  group: 'User Profile',
  status: 'wip',
  title: 'UserProfileProfilePanel',
  label: 'Profile panel',
  navigation: { category: 'Panels' },
  source: 'packages/mosaic/src/features/user-profile/user-profile-profile-panel.view.tsx',
};

export function Default(_args: Record<string, unknown>) {
  const titleRef = useRef<HTMLDivElement>(null);
  const { imageUrl, showFile, clearImage } = usePreviewImage(profileImageUrl);
  const connections = useConnectedAccountsFixture();
  const wallets = useWeb3WalletsFixture();
  const editName = useUserProfileEditNameFixture();
  const editUsername = useUserProfileEditUsernameFixture();
  const { addEmail: _addEmail, ...emails } = useUserProfileEmailsFixture({ username: editUsername.username });
  const phones = useUserProfilePhonesFixture();

  return (
    <UserProfileProfilePanelView
      titleRef={titleRef}
      profileSlot={
        <UserProfileProfileSectionView
          {...editName}
          hasImage={Boolean(imageUrl)}
          imageUrl={imageUrl}
          onProfilePictureChange={showFile}
          onRemoveProfilePicture={clearImage}
        />
      }
      usernameSlot={
        <UserProfileUsernameSectionView
          username={editUsername.username}
          onSubmit={editUsername.onSubmitUsername}
        />
      }
      emailSlot={<UserProfileEmailSectionView {...emails} />}
      phoneSlot={<UserProfilePhoneSectionView {...phones} />}
      connectedAccountsSlot={
        <UserProfileConnectedAccountsSectionView
          {...connections}
          fallbackFocus={() => titleRef.current}
        />
      }
      web3WalletsSlot={
        <UserProfileWeb3WalletsSectionView
          {...wallets}
          fallbackFocus={() => titleRef.current}
        />
      }
      dangerSlot={<UserProfileDangerPreview />}
    />
  );
}
