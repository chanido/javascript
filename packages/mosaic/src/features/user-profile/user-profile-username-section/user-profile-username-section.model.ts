import { isAttributeAvailable } from '../user-profile.utils';
import { useUserProfileUserModel } from '../user-profile-user.model';
import type { UserProfileEditUsernameField } from './user-profile-edit-username.dialog';
import type { UserProfileUsernameSectionViewProps } from './user-profile-username-section.view';

export type UserProfileUsernameSectionModel =
  | { status: 'loading' }
  | { status: 'hidden' }
  | (UserProfileUsernameSectionViewProps & { status: 'ready'; userId: string });

const USERNAME_FIELDS: readonly UserProfileEditUsernameField[] = ['username'];

export function useUserProfileUsernameSectionModel(): UserProfileUsernameSectionModel {
  const model = useUserProfileUserModel();
  if (model.status !== 'ready') {
    return model;
  }

  const { user, environment, saveAsUser } = model;
  const { attributes, usernameSettings } = environment.userSettings;
  const attribute = attributes.username;
  const immutable = Boolean(attribute?.immutable);

  if (!isAttributeAvailable(attribute) || (immutable && !user.username)) {
    return { status: 'hidden' };
  }

  return {
    status: 'ready',
    userId: user.id,
    username: user.username ?? '',
    required: Boolean(attribute?.required),
    onSubmit: immutable
      ? undefined
      : username =>
          saveAsUser(current => current.update({ username }), USERNAME_FIELDS, {
            min_length: usernameSettings.min_length,
            max_length: usernameSettings.max_length,
          }),
  };
}
