import { useUserProfileProfileSectionModel } from './user-profile-profile-section.model';
import { UserProfileProfileSectionView } from './user-profile-profile-section.view';

export function UserProfileProfileSection() {
  const model = useUserProfileProfileSectionModel();

  if (model.status !== 'ready') {
    return null;
  }

  const { status: _status, userId, ...viewProps } = model;

  return (
    <UserProfileProfileSectionView
      key={userId}
      {...viewProps}
    />
  );
}
