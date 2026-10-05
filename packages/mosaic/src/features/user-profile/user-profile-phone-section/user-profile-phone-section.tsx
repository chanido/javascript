import { useUserProfilePhoneSectionModel } from './user-profile-phone-section.model';
import { UserProfilePhoneSectionView } from './user-profile-phone-section.view';

export function UserProfilePhoneSection() {
  const model = useUserProfilePhoneSectionModel();

  if (model.status !== 'ready') {
    return null;
  }

  const { status: _status, userId, ...viewProps } = model;

  return (
    <UserProfilePhoneSectionView
      key={userId}
      {...viewProps}
    />
  );
}
