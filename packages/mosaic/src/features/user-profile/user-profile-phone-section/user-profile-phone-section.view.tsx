import { stringToFormattedPhoneString } from '@clerk/shared/phone';
import { useMemo, useRef } from 'react';

import { Confirmation } from '../../../blocks/confirmation';
import { Button } from '../../../components/button';
import { Dialog } from '../../../components/dialog';
import { Icon } from '../../../components/icon';
import type { CountryIso } from '../../../components/phone-input';
import { Section } from '../../../components/section';
import { useListRemovalFocus } from '../../../hooks/use-list-removal-focus';
import { fill, useMessages } from '../../../localization';
import type { UserProfilePhone, UserProfilePhoneVerifier } from '../user-profile-contact.types';
import { UserProfileContactListRowView } from '../user-profile-contact-list-row.view';
import { useUserProfileSetPrimaryController } from '../user-profile-set-primary.controller';
import { useUserProfileAddPhoneController } from './user-profile-add-phone.controller';
import { UserProfileAddPhoneDialog } from './user-profile-add-phone.dialog';

export interface UserProfilePhoneSectionViewProps {
  phones: UserProfilePhone[];
  defaultPhoneCountry?: CountryIso;
  onCreatePhone?: (phoneNumber: string) => Promise<UserProfilePhoneVerifier>;
  getPhoneVerifier?: (id: string) => UserProfilePhoneVerifier;
  onVerifyPhone?: (id: string) => void;
  onSetPrimaryPhone?: (id: string) => void | Promise<void>;
  onRemovePhone?: (id: string) => void | Promise<void>;
}

export function UserProfilePhoneSectionView({
  phones,
  defaultPhoneCountry,
  onCreatePhone,
  getPhoneVerifier,
  onVerifyPhone,
  onSetPrimaryPhone,
  onRemovePhone,
}: UserProfilePhoneSectionViewProps) {
  const m = useMessages('userProfileContact');
  const row = useRef<HTMLDivElement>(null);
  const removalFocus = useListRemovalFocus({
    ids: phones.map(phone => phone.id),
    onRemove: onRemovePhone,
    fallback: () => row.current?.querySelector<HTMLButtonElement>('button:not([disabled])') ?? row.current,
  });
  const verification = useUserProfileAddPhoneController({ onCreate: onCreatePhone });
  const verificationDialog = useMemo(() => Dialog.createHandle(), []);
  const canVerify = Boolean(getPhoneVerifier);
  const addPhoneAction =
    canVerify && onCreatePhone ? (
      <Dialog.Trigger
        handle={verificationDialog}
        render={
          <Button
            aria-label={m.phone.add}
            color='neutral'
            size='sm'
            variant='outline'
          />
        }
      >
        <Icon
          name='plus'
          placement='inline-start'
          size='sm'
        />
        {m.add}
      </Dialog.Trigger>
    ) : undefined;
  const verifyingId = useRef<string | undefined>(undefined);
  const verifyPhone = (id: string) => {
    const phone = phones.find(phone => phone.id === id);
    if (phone && getPhoneVerifier) {
      verifyingId.current = id;
      verification.onVerifyPhone(phone.value, getPhoneVerifier(id));
    }
  };
  const removePhoneConfirmation = useMemo(() => Confirmation.createHandle<UserProfilePhone>(), []);
  const primary = useUserProfileSetPrimaryController({
    items: phones,
    onSetPrimary: onSetPrimaryPhone,
  });

  const removePhone = (id: string) => {
    const phone = phones.find(phone => phone.id === id);
    if (phone && onRemovePhone) {
      removePhoneConfirmation.open(phone);
    }
  };
  const formattedPhones = phones.map(phone => ({
    ...phone,
    value: stringToFormattedPhoneString(phone.value),
  }));

  const dialog = canVerify ? (
    <UserProfileAddPhoneDialog
      {...verification}
      defaultCountry={defaultPhoneCountry}
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
        items={formattedPhones}
        kind='phone'
        label={m.phone.label}
        addAction={addPhoneAction}
        onRemove={onRemovePhone ? removePhone : undefined}
        onSetPrimary={primary.onSetPrimary}
        onVerify={canVerify ? verifyPhone : onVerifyPhone}
      >
        <Section.Error>{primary.error}</Section.Error>
      </UserProfileContactListRowView>
      {dialog}
      {onRemovePhone ? (
        <Confirmation
          handle={removePhoneConfirmation}
          title={m.phone.removeDialog.title}
          description={phone =>
            fill(phone.isVerified ? m.phone.removeDialog.verifiedDescription : m.phone.removeDialog.description, {
              phoneNumber: stringToFormattedPhoneString(phone.value),
            })
          }
          actionLabel={m.phone.removeDialog.confirm}
          cancelLabel={m.phone.removeDialog.cancel}
          finalFocus={removalFocus.finalFocus}
          onConfirm={phone => removalFocus.remove(phone.id)}
        />
      ) : null}
    </Section.Root>
  );
}
