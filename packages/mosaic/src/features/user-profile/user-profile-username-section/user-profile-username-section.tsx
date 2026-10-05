import { useUserProfileUsernameSectionModel } from './user-profile-username-section.model';
import { UserProfileUsernameSectionView } from './user-profile-username-section.view';

export function UserProfileUsernameSection() {
  const model = useUserProfileUsernameSectionModel();

  if (model.status !== 'ready') {
    return null;
  }

  const { status: _status, userId, ...viewProps } = model;

  return (
    <UserProfileUsernameSectionView
      key={userId}
      {...viewProps}
    />
  );
}
