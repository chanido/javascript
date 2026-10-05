import { Button } from '../../../components/button';
import { Section } from '../../../components/section';
import { useMessages } from '../../../localization';
import { useUserProfileEditUsernameController } from './user-profile-edit-username.controller';
import { UserProfileEditUsernameDialog } from './user-profile-edit-username.dialog';

export interface UserProfileUsernameSectionViewProps {
  username: string;
  required?: boolean;
  onSubmit?: (username: string) => Promise<void>;
}

export function UserProfileUsernameSectionView({
  username,
  required = false,
  onSubmit,
}: UserProfileUsernameSectionViewProps) {
  const m = useMessages('userProfileUsernameSection');
  return (
    <Section.Root>
      <Section.Group>
        <Section.Header>
          <Section.Title>{m.title}</Section.Title>
        </Section.Header>
        <Section.Body>
          <Section.Items>
            <Section.Item>
              <Section.Content>
                <Section.Description>{username || m.empty}</Section.Description>
              </Section.Content>
              {onSubmit ? (
                <Section.Actions>
                  <EditUsername
                    username={username}
                    required={required}
                    onSubmit={onSubmit}
                  />
                </Section.Actions>
              ) : null}
            </Section.Item>
          </Section.Items>
        </Section.Body>
      </Section.Group>
    </Section.Root>
  );
}

function EditUsername({
  username,
  required,
  onSubmit,
}: {
  username: string;
  required: boolean;
  onSubmit: (username: string) => Promise<void>;
}) {
  const m = useMessages('userProfileUsernameSection');
  const controller = useUserProfileEditUsernameController({ username, required, onSubmit });
  const isSet = Boolean(username);

  return (
    <UserProfileEditUsernameDialog
      form={controller.form}
      open={controller.isOpen}
      onOpenChange={controller.onOpenChange}
      title={isSet ? m.dialogTitle : m.addDialogTitle}
      trigger={
        <Button
          color='neutral'
          size='sm'
          variant='outline'
        >
          {isSet ? m.edit : m.add}
        </Button>
      }
    />
  );
}
