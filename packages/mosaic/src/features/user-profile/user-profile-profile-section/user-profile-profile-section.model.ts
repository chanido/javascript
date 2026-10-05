import { getFullName } from '@clerk/shared/internal/clerk-js/user';
import type { AttributeData, EnterpriseAccountResource } from '@clerk/shared/types';

import type { UserProfileManagedBy } from '../user-profile-managed-by';
import { useUserProfileUserModel } from '../user-profile-user.model';
import type { UserProfileEditNameField } from './user-profile-edit-name.dialog';
import type { UserProfileNameAttribute } from './user-profile-profile-section.types';
import type { UserProfileProfileSectionViewProps } from './user-profile-profile-section.view';

export type UserProfileProfileSectionModel =
  | { status: 'loading' }
  | { status: 'hidden' }
  | (Omit<UserProfileProfileSectionViewProps, 'onProfilePictureReject'> & { status: 'ready'; userId: string });

const NAME_FIELDS: readonly UserProfileEditNameField[] = ['firstName', 'lastName'];

function toManagedBy(account: EnterpriseAccountResource | undefined): UserProfileManagedBy | undefined {
  if (!account) {
    return undefined;
  }
  const connection = account.enterpriseConnection;
  return { name: connection?.name || account.provider.replace(/^(oauth_|saml_)/, '') };
}

function toNameAttribute(attribute: AttributeData | undefined): UserProfileNameAttribute {
  return { enabled: attribute?.enabled ?? false, required: attribute?.required ?? false };
}

export function useUserProfileProfileSectionModel(): UserProfileProfileSectionModel {
  const model = useUserProfileUserModel();
  if (model.status !== 'ready') {
    return model;
  }

  const { user, environment, saveAsUser } = model;
  const { attributes } = environment.userSettings;
  const nameManagedBy = toManagedBy(user.enterpriseAccounts.find(account => account.active));

  return {
    status: 'ready',
    userId: user.id,
    name: getFullName(user),
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    firstNameAttribute: toNameAttribute(attributes.first_name),
    lastNameAttribute: toNameAttribute(attributes.last_name),
    nameManagedBy,
    imageUrl: user.imageUrl,
    hasImage: user.hasImage,
    onProfilePictureChange: file => saveAsUser(current => current.setProfileImage({ file })),
    onRemoveProfilePicture: user.hasImage
      ? () => saveAsUser(current => current.setProfileImage({ file: null }))
      : undefined,
    onSubmitName: nameManagedBy
      ? undefined
      : value =>
          saveAsUser(current => current.update({ firstName: value.firstName, lastName: value.lastName }), NAME_FIELDS),
  };
}
