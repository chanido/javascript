import { inertProps } from '@clerk/shared/inert';
import * as stylex from '@stylexjs/stylex';
import type { ReactNode, Ref } from 'react';
import { useEffect, useRef } from 'react';

import type { ActionMenuAction } from '../../../components/action-menu';
import { ActionMenu } from '../../../components/action-menu';
import { Badge } from '../../../components/badge';
import { Button } from '../../../components/button';
import { Icon } from '../../../components/icon';
import { Section } from '../../../components/section';
import { Spinner } from '../../../components/spinner';
import { fill, useMessages } from '../../../localization';
import { usePresenceList, useTransition } from '../../../primitives/hooks';
import { reset } from '../../../styles/reset.styles';
import { truncationStyles } from '../../../styles/typography.styles';
import { styles as panelStyles } from '../user-profile-profile-panel.styles';
import { contactItemMarker, contactSlotMarker } from './user-profile-account-section.markers.stylex';
import { styles } from './user-profile-account-section.styles';

export interface UserProfileContactListRowViewProps {
  rowRef?: Ref<HTMLDivElement>;
  triggerRef?: (id: string) => Ref<HTMLButtonElement>;
  addAction?: ReactNode;
  kind: 'email' | 'phone';
  label: string;
  items: Array<{ id: string; value: string; isDefault?: boolean; isVerified?: boolean; canRemove?: boolean }>;
  onAdd?: () => void;
  onVerify?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onRemove?: (id: string) => void;
  /** The item whose set-primary request is in flight; it announces busy. */
  pendingId?: string;
  /** The item that shows the pending indicator: the request has outlasted a short delay, and the indicator is held for its minimum. */
  shownPendingId?: string;
  children?: ReactNode;
}

const byId = (item: { id: string }) => item.id;

function PrimaryBadge({ open, children }: { open: boolean; children: ReactNode }) {
  const element = useRef<HTMLSpanElement>(null);
  const { mounted, transitionProps } = useTransition({ open, ref: element });

  if (!mounted) {
    return null;
  }

  return (
    <Badge
      ref={element}
      color='neutral'
      xstyle={styles.badgeSlotItem}
      {...transitionProps}
    >
      {children}
    </Badge>
  );
}

function PendingIndicator({ open, label }: { open: boolean; label: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const { mounted, transitionProps } = useTransition({ open, ref: element });

  if (!mounted) {
    return null;
  }

  return (
    <Spinner
      ref={element}
      role='progressbar'
      aria-hidden={undefined}
      aria-label={label}
      size='sm'
      xstyle={styles.badgeSlotItem}
      {...transitionProps}
    />
  );
}

function ContactListItem({
  present = true,
  appear = true,
  pending = false,
  onExited,
  actions,
  children,
}: {
  present?: boolean;
  appear?: boolean;
  pending?: boolean;
  onExited?: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const element = useRef<HTMLLIElement>(null);
  const { mounted, transitionProps } = useTransition({ open: present, ref: element });

  useEffect(() => {
    if (!mounted) {
      onExited?.();
    }
  }, [mounted, onExited]);
  useEffect(() => () => onExited?.(), [onExited]);

  if (!mounted) {
    return null;
  }

  const stateProps = { ...transitionProps, style: undefined };

  return (
    <li
      ref={element}
      aria-hidden={present ? undefined : true}
      {...stylex.props(reset.base, styles.contactSlot, appear && styles.contactSlotAppear, contactSlotMarker)}
      {...stateProps}
      {...inertProps(!present)}
    >
      <div {...stylex.props(styles.contactClip)}>
        <Section.Item
          render={<div />}
          aria-busy={pending || undefined}
          data-pending={pending ? '' : undefined}
          xstyle={[styles.contactItem, contactItemMarker]}
          {...transitionProps}
        >
          <Section.Content xstyle={styles.contactFade}>{children}</Section.Content>
          {actions ? <Section.Actions xstyle={styles.contactFade}>{actions}</Section.Actions> : null}
        </Section.Item>
      </div>
    </li>
  );
}

export function UserProfileContactListRowView({
  kind,
  label,
  items,
  onAdd,
  onVerify,
  onSetPrimary,
  onRemove,
  pendingId,
  shownPendingId,
  addAction,
  rowRef,
  triggerRef,
  children,
}: UserProfileContactListRowViewProps) {
  const m = useMessages('userProfileAccountSection');
  const emptyDescription = m[kind].empty;
  const entries = usePresenceList(items, byId);
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);

  return (
    <Section.Group
      ref={rowRef}
      tabIndex={-1}
    >
      <Section.Header>
        <Section.Title>{label}</Section.Title>
        {addAction ? (
          <Section.Actions>{addAction}</Section.Actions>
        ) : onAdd ? (
          <Section.Actions>
            <Button
              aria-label={m[kind].add}
              color='neutral'
              size='sm'
              variant='outline'
              onClick={onAdd}
            >
              <Icon
                name='plus'
                placement='inline-start'
                size='sm'
              />
              {m.add}
            </Button>
          </Section.Actions>
        ) : null}
      </Section.Header>
      <Section.Body>
        <Section.Items>
          {entries.map(({ key, item, present, onExited }) => {
            const actions: ActionMenuAction[] = [];

            if (item.isVerified === false && onVerify) {
              actions.push({
                label: item.isDefault ? m.completeVerification : m[kind].verify,
                onClick: () => onVerify(item.id),
              });
            } else if (!item.isDefault && item.isVerified === true && onSetPrimary) {
              actions.push({ label: m.setPrimary, onClick: () => onSetPrimary(item.id) });
            }

            if (onRemove && item.canRemove !== false) {
              actions.push({
                label: m[kind].remove,
                color: 'negative',
                onClick: () => onRemove(item.id),
              });
            }

            return (
              <ContactListItem
                key={key}
                present={present}
                appear={settled.current}
                pending={pendingId === item.id}
                onExited={onExited}
                actions={
                  actions.length > 0 ? (
                    <ActionMenu
                      triggerRef={present ? triggerRef?.(item.id) : undefined}
                      actions={actions}
                      label={fill(m.manageValue, { value: item.value })}
                    />
                  ) : null
                }
              >
                <Section.Description xstyle={panelStyles.contactValue}>
                  <span {...stylex.props(truncationStyles.singleLine, panelStyles.contactText)}>{item.value}</span>
                  <span {...stylex.props(styles.badgeSlot)}>
                    <PrimaryBadge open={item.isDefault === true}>{m.primary}</PrimaryBadge>
                    <PendingIndicator
                      open={shownPendingId === item.id}
                      label={m.settingPrimary}
                    />
                  </span>
                </Section.Description>
              </ContactListItem>
            );
          })}
          {items.length === 0 ? (
            <ContactListItem appear={settled.current}>
              <Section.Description>{emptyDescription}</Section.Description>
            </ContactListItem>
          ) : null}
        </Section.Items>
        {children}
      </Section.Body>
    </Section.Group>
  );
}
