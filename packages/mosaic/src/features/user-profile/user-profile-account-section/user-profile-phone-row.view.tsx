import { stringToFormattedPhoneString } from '@clerk/shared/phone';
import { useMemo, useRef, useState } from 'react';

import { Confirmation } from '../../../blocks/confirmation';
import { Button } from '../../../components/button';
import { Icon } from '../../../components/icon';
import { Section } from '../../../components/section';
import { useListRemovalFocus } from '../../../hooks/use-list-removal-focus';
import { useSpinDelay } from '../../../hooks/use-spin-delay';
import { fill, useMessages } from '../../../localization';
import { useStableOrder } from '../../../primitives/hooks';
import type { UserProfilePhone } from './user-profile-account-section.types';
import type { UserProfileAddPhoneControllerOptions } from './user-profile-add-phone.controller';
import { useUserProfileAddPhoneController } from './user-profile-add-phone.controller';
import { UserProfileAddPhoneDialog } from './user-profile-add-phone.dialog';
import { UserProfileContactListRowView } from './user-profile-contact-list-row.view';
import { UserProfileContactRowView } from './user-profile-contact-row.view';

const byId = (item: { id: string }) => item.id;

export interface UserProfilePhoneRowViewProps {
  phones: UserProfilePhone[];
  allowMultipleAccounts?: boolean;
  onSendPhoneCode?: (phoneNumber: string) => Promise<void>;
  onVerifyPhoneCode?: (phoneNumber: string, code: string) => Promise<void>;
  onManagePhone?: (id: string) => void;
  onVerifyPhone?: (id: string) => void;
  onSetPrimaryPhone?: (id: string) => void | Promise<void>;
  onRemovePhone?: (id: string) => void | Promise<void>;
}

export function UserProfilePhoneRowView({
  phones,
  allowMultipleAccounts = false,
  onSendPhoneCode,
  onVerifyPhoneCode,
  onManagePhone,
  onVerifyPhone,
  onSetPrimaryPhone,
  onRemovePhone,
}: UserProfilePhoneRowViewProps) {
  const m = useMessages('userProfileAccountSection');
  const row = useRef<HTMLDivElement>(null);
  const formattedPhones = useMemo(
    () => phones.map(phone => ({ ...phone, value: stringToFormattedPhoneString(phone.value) })),
    [phones],
  );
  const orderedPhones = useStableOrder(formattedPhones, byId);
  const [pendingPrimaryId, setPendingPrimaryId] = useState<string>();
  const shownPendingId = useSpinDelay(pendingPrimaryId ?? null) ?? undefined;
  const showPending = shownPendingId !== undefined;
  const [heldPhones, setHeldPhones] = useState(orderedPhones);
  if (!showPending && heldPhones !== orderedPhones) {
    setHeldPhones(orderedPhones);
  }
  const shownPhones = showPending ? heldPhones : orderedPhones;
  const removalFocus = useListRemovalFocus({
    ids: shownPhones.map(phone => phone.id),
    onRemove: onRemovePhone,
    fallback: () =>
      Array.from(row.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []).find(
        button => !button.closest('[aria-hidden="true"]'),
      ) ?? row.current,
  });
  const addPhoneAction =
    onSendPhoneCode && onVerifyPhoneCode ? (
      <AddPhone
        options={{ onSend: onSendPhoneCode, onVerify: onVerifyPhoneCode }}
        compact={allowMultipleAccounts}
      />
    ) : undefined;
  const removePhoneConfirmation = useMemo(() => Confirmation.createHandle<UserProfilePhone>(), []);
  const [primaryError, setPrimaryError] = useState<string>();
  const settingPrimary = useRef(false);

  const setPrimaryPhone = async (id: string) => {
    const phone = phones.find(phone => phone.id === id);
    if (!onSetPrimaryPhone || !phone?.isVerified || phone.isDefault || settingPrimary.current) {
      return;
    }
    settingPrimary.current = true;
    setPendingPrimaryId(id);
    setPrimaryError(undefined);
    try {
      await onSetPrimaryPhone(id);
    } catch (error) {
      setPrimaryError(error instanceof Error ? error.message : m.phone.primaryError);
    } finally {
      settingPrimary.current = false;
      setPendingPrimaryId(undefined);
    }
  };

  const removePhone = (id: string) => {
    const phone = phones.find(phone => phone.id === id);
    if (phone && phone.canRemove !== false && onRemovePhone) {
      removePhoneConfirmation.open(phone);
    }
  };
  if (!allowMultipleAccounts) {
    return (
      <UserProfileContactRowView
        items={shownPhones}
        kind='phone'
        label={m.phone.label}
        addAction={addPhoneAction}
        onManage={onManagePhone}
      />
    );
  }

  return (
    <>
      <UserProfileContactListRowView
        rowRef={row}
        triggerRef={removalFocus.registerTrigger}
        items={shownPhones}
        kind='phone'
        label={m.phone.label}
        addAction={addPhoneAction}
        onRemove={onRemovePhone ? removePhone : undefined}
        onSetPrimary={
          onSetPrimaryPhone && !pendingPrimaryId && !showPending ? id => void setPrimaryPhone(id) : undefined
        }
        pendingId={pendingPrimaryId}
        shownPendingId={shownPendingId}
        onVerify={onVerifyPhone}
      >
        <Section.Error>{primaryError}</Section.Error>
      </UserProfileContactListRowView>
      {onRemovePhone ? (
        <Confirmation
          handle={removePhoneConfirmation}
          title={m.phone.removeDialog.title}
          description={phone =>
            fill(m.phone.removeDialog.description, { phoneNumber: stringToFormattedPhoneString(phone.value) })
          }
          actionLabel={m.phone.removeDialog.confirm}
          cancelLabel={m.phone.removeDialog.cancel}
          finalFocus={removalFocus.finalFocus}
          onConfirm={phone => removalFocus.remove(phone.id)}
        />
      ) : null}
    </>
  );
}

function AddPhone({ options, compact }: { options: UserProfileAddPhoneControllerOptions; compact: boolean }) {
  const m = useMessages('userProfileAccountSection');
  const controller = useUserProfileAddPhoneController(options);
  return (
    <UserProfileAddPhoneDialog
      {...controller}
      trigger={
        <Button
          aria-label={m.phone.add}
          color='neutral'
          size='sm'
          variant='outline'
        >
          {compact ? (
            <Icon
              name='plus'
              placement='inline-start'
              size='sm'
            />
          ) : null}
          {compact ? m.add : m.phone.add}
        </Button>
      }
    />
  );
}
