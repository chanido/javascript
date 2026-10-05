import { useUserProfileEmailSectionModel } from './user-profile-email-section.model';
import { UserProfileEmailSectionView } from './user-profile-email-section.view';

export function UserProfileEmailSection() {
  const model = useUserProfileEmailSectionModel();

  if (model.status !== 'ready') {
    return null;
  }

  const { status: _status, userId, ...viewProps } = model;

  return (
    <UserProfileEmailSectionView
      key={userId}
      {...viewProps}
    />
  );
}
