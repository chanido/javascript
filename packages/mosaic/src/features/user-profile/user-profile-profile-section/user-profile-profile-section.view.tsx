import { Section } from '../../../components/section';
import { useMessages } from '../../../localization';
import type { FileRejection } from '../../../primitives/file-upload';
import type { UserProfileManagedBy } from '../user-profile-managed-by';
import type { UserProfileEditNameValue } from './user-profile-edit-name.dialog';
import { UserProfileNameRowView } from './user-profile-name-row.view';
import { UserProfilePictureRowView } from './user-profile-picture-row.view';
import type { UserProfileNameAttribute } from './user-profile-profile-section.types';

export type { UserProfileEditNameValue } from './user-profile-edit-name.dialog';
export type { UserProfileNameAttribute } from './user-profile-profile-section.types';

export interface UserProfileProfileSectionViewProps {
  imageUrl?: string;
  /**
   * Whether `imageUrl` is a picture the user uploaded. Clerk's image service always returns a URL —
   * a generated initials avatar when none was uploaded — so the row cannot tell the two apart from
   * `imageUrl` alone. Supplied from `user.hasImage`.
   */
  hasImage?: boolean;
  name: string;
  /** Passed alongside `name`, which cannot be split back into its two halves. */
  firstName?: string;
  lastName?: string;
  firstNameAttribute?: UserProfileNameAttribute;
  lastNameAttribute?: UserProfileNameAttribute;
  nameManagedBy?: UserProfileManagedBy;
  onProfilePictureChange?: (file: File) => Promise<void>;
  onProfilePictureReject?: (rejections: FileRejection[]) => void;
  onRemoveProfilePicture?: () => Promise<void>;
  onSubmitName?: (value: UserProfileEditNameValue) => Promise<void>;
}

export function UserProfileProfileSectionView({
  imageUrl,
  hasImage = false,
  name,
  firstName,
  lastName,
  firstNameAttribute,
  lastNameAttribute,
  nameManagedBy,
  onProfilePictureChange,
  onProfilePictureReject,
  onRemoveProfilePicture,
  onSubmitName,
}: UserProfileProfileSectionViewProps) {
  const m = useMessages('userProfileProfileSection');
  const showName = firstNameAttribute?.enabled !== false || lastNameAttribute?.enabled !== false;

  return (
    <Section.Root>
      <Section.Group>
        <Section.Header>
          <Section.Title>{m.title}</Section.Title>
        </Section.Header>
        <Section.Body>
          <UserProfilePictureRowView
            name={name}
            imageUrl={imageUrl}
            hasImage={hasImage}
            onChange={onProfilePictureChange}
            onReject={onProfilePictureReject}
            onRemove={onRemoveProfilePicture}
          />
          {showName ? (
            <UserProfileNameRowView
              name={name}
              firstName={firstName}
              lastName={lastName}
              firstNameAttribute={firstNameAttribute}
              lastNameAttribute={lastNameAttribute}
              managedBy={nameManagedBy}
              onSubmit={onSubmitName}
            />
          ) : null}
        </Section.Body>
      </Section.Group>
    </Section.Root>
  );
}
