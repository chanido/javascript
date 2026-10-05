import { useMemo, useRef } from 'react';

import { Confirmation } from '../../../blocks/confirmation';
import { Button } from '../../../components/button';
import { Dialog } from '../../../components/dialog';
import { Icon } from '../../../components/icon';
import { Section } from '../../../components/section';
import { useListRemovalFocus } from '../../../hooks/use-list-removal-focus';
import { fill, useMessages } from '../../../localization';
import type { UserProfileEmail, UserProfileEmailVerifier } from '../user-profile-contact.types';
import { UserProfileContactListRowView } from '../user-profile-contact-list-row.view';
import { useUserProfileSetPrimaryController } from '../user-profile-set-primary.controller';
import { useUserProfileAddEmailController } from './user-profile-add-email.controller';
import { UserProfileAddEmailDialog } from './user-profile-add-email.dialog';

export interface UserProfileEmailSectionViewProps {
  emails: UserProfileEmail[];
  username?: string;
  onAddEmail?: () => void;
  onCreateEmail?: (emailAddress: string) => Promise<UserProfileEmailVerifier>;
  getEmailVerifier?: (id: string) => UserProfileEmailVerifier;
  onVerifyEmail?: (id: string) => void;
  onSetPrimaryEmail?: (id: string) => void | Promise<void>;
  onRemoveEmail?: (id: string) => void | Promise<void>;
}

export function UserProfileEmailSectionView({
  emails,
  username,
  onAddEmail,
  onCreateEmail,
  getEmailVerifier,
  onVerifyEmail,
  onSetPrimaryEmail,
  onRemoveEmail,
}: UserProfileEmailSectionViewProps) {
  const m = useMessages('userProfileContact');
  const row = useRef<HTMLDivElement>(null);
  const removalFocus = useListRemovalFocus({
    ids: emails.map(email => email.id),
    onRemove: onRemoveEmail,
    fallback: () => row.current?.querySelector<HTMLButtonElement>('button:not([disabled])') ?? row.current,
  });
  const verification = useUserProfileAddEmailController({
    username,
    onCreate: onCreateEmail,
  });
  const verificationDialog = useMemo(() => Dialog.createHandle(), []);
  const canVerify = Boolean(getEmailVerifier);
  const addEmailLabel = (
    <>
      <Icon
        name='plus'
        placement='inline-start'
        size='sm'
      />
      {m.add}
    </>
  );
  const addEmailAction =
    canVerify && onCreateEmail ? (
      <Dialog.Trigger
        handle={verificationDialog}
        render={
          <Button
            aria-label={m.email.add}
            color='neutral'
            size='sm'
            variant='outline'
          />
        }
      >
        {addEmailLabel}
      </Dialog.Trigger>
    ) : onAddEmail ? (
      <Button
        aria-label={m.email.add}
        color='neutral'
        size='sm'
        variant='outline'
        onClick={onAddEmail}
      >
        {addEmailLabel}
      </Button>
    ) : undefined;
  const verifyingId = useRef<string | undefined>(undefined);
  const verifyEmail = (id: string) => {
    const email = emails.find(email => email.id === id);
    if (email && getEmailVerifier) {
      verifyingId.current = id;
      verification.onVerifyEmail(email.value, getEmailVerifier(id));
    }
  };
  const removeEmailConfirmation = useMemo(() => Confirmation.createHandle<UserProfileEmail>(), []);
  const primary = useUserProfileSetPrimaryController({
    items: emails,
    onSetPrimary: onSetPrimaryEmail,
  });

  const removeEmail = (id: string) => {
    const email = emails.find(email => email.id === id);
    if (email && onRemoveEmail) {
      removeEmailConfirmation.open(email);
    }
  };

  const dialog = canVerify ? (
    <UserProfileAddEmailDialog
      {...verification}
      handle={verificationDialog}
      finalFocus={() => {
        const id = verifyingId.current;
        verifyingId.current = undefined;
        return id ? removalFocus.trigger(id) : null;
      }}
    />
  ) : null;

  return (
    <Section.Root>
      <UserProfileContactListRowView
        rowRef={row}
        triggerRef={removalFocus.registerTrigger}
        items={emails}
        kind='email'
        label={m.email.label}
        addAction={addEmailAction}
        onRemove={onRemoveEmail ? removeEmail : undefined}
        onSetPrimary={primary.onSetPrimary}
        onVerify={canVerify ? verifyEmail : onVerifyEmail}
      >
        <Section.Error>{primary.error}</Section.Error>
      </UserProfileContactListRowView>
      {dialog}
      {onRemoveEmail ? (
        <Confirmation
          handle={removeEmailConfirmation}
          title={m.email.removeDialog.title}
          description={email =>
            fill(email.isVerified ? m.email.removeDialog.verifiedDescription : m.email.removeDialog.description, {
              emailAddress: email.value,
            })
          }
          actionLabel={m.email.removeDialog.confirm}
          cancelLabel={m.email.removeDialog.cancel}
          finalFocus={removalFocus.finalFocus}
          onConfirm={email => removalFocus.remove(email.id)}
        />
      ) : null}
    </Section.Root>
  );
}
