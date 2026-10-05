import type {
  UserProfileEmail,
  UserProfileEmailVerification,
} from '@clerk/mosaic/features/user-profile/user-profile-contact.types';
import type { UserProfileEmailSectionViewProps } from '@clerk/mosaic/features/user-profile/user-profile-email-section/user-profile-email-section.view';
import { useState } from 'react';

import { createUserProfileAddEmailFixture } from './user-profile-add-email';

export const exampleEmails: UserProfileEmail[] = [
  { id: 'email_1', value: 'item1@clerk.dev', isDefault: true, isVerified: true },
  { id: 'email_2', value: 'item2@clerk.dev', isDefault: false, isVerified: true },
];

export interface UserProfileEmailsFixtureOptions {
  initialEmails?: UserProfileEmail[];
  username?: string;
  method?: UserProfileEmailVerification['method'];
  failVerification?: boolean;
  removalState?: 'pending' | 'error';
  /** Replaces the default verification flow, e.g. for a custom dialog example. */
  onAddEmail?: () => void;
}

export function useUserProfileEmailsFixture({
  initialEmails = exampleEmails,
  username,
  method,
  failVerification = false,
  removalState,
  onAddEmail,
}: UserProfileEmailsFixtureOptions = {}): UserProfileEmailSectionViewProps & { addEmail: (value: string) => void } {
  const [emails, setEmails] = useState(initialEmails);
  const [removalFailed, setRemovalFailed] = useState(false);
  const flow = createUserProfileAddEmailFixture({
    method,
    fail: failVerification ? 'verify' : undefined,
    onCreated: (id, value) => setEmails(current => [...current, { id, value, isDefault: false, isVerified: false }]),
    onVerified: id =>
      setEmails(current => current.map(email => (email.id === id ? { ...email, isVerified: true } : email))),
  });

  return {
    emails,
    addEmail: value =>
      setEmails(current => [...current, { id: `email_${Date.now()}`, value, isDefault: false, isVerified: false }]),
    username,
    onAddEmail,
    onCreateEmail: onAddEmail ? undefined : flow.onCreateEmail,
    getEmailVerifier: onAddEmail ? undefined : flow.getEmailVerifier,
    onVerifyEmail: id =>
      setEmails(current => current.map(email => (email.id === id ? { ...email, isVerified: true } : email))),
    onSetPrimaryEmail: id => setEmails(current => current.map(email => ({ ...email, isDefault: email.id === id }))),
    onRemoveEmail: async id => {
      if (removalState === 'pending') {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (removalState === 'error' && !removalFailed) {
        setRemovalFailed(true);
        throw new Error('Unable to remove this email address. Try again.');
      }
      setEmails(current => current.filter(email => email.id !== id));
    },
  };
}
