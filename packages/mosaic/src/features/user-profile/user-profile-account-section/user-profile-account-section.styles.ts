import * as stylex from '@stylexjs/stylex';

import { durationVars, easingVars, focusVars, space } from '../../../tokens.stylex';
import { contactItemMarker, contactSlotMarker } from './user-profile-account-section.markers.stylex';

export const styles = stylex.create({
  contactSlot: {
    display: {
      default: 'grid',
      '@media (prefers-reduced-motion: reduce)': { default: 'grid', ':where([data-closed])': 'none' },
    },
    gridTemplateRows: {
      default: '1fr',
      ':where([data-ending-style])': '0fr',
    },
    transitionDelay: durationVars['--cl-duration-base'],
    transitionDuration: durationVars['--cl-duration-slower'],
    transitionProperty: {
      default: 'grid-template-rows',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionTimingFunction: easingVars['--cl-ease-in-out'],
  },
  contactSlotAppear: {
    gridTemplateRows: {
      '@starting-style': '0fr',
      default: '1fr',
      ':where([data-ending-style])': '0fr',
    },
  },
  contactClip: {
    marginInline: `calc(-1 * (${focusVars['--cl-focus-outline-width']} + ${focusVars['--cl-focus-outline-offset']}))`,
    overflow: 'clip',
    paddingInline: `calc(${focusVars['--cl-focus-outline-width']} + ${focusVars['--cl-focus-outline-offset']})`,
    alignContent: 'start',
    display: 'grid',
    gridRowEnd: 'span 2',
    gridRowStart: '1',
    maskImage: `linear-gradient(to top, transparent, black ${space['4']})`,
    minHeight: 0,
  },
  contactItem: {
    borderBlockStartWidth: {
      default: '1px',
      [stylex.when.ancestor(':where(:first-child)', contactSlotMarker)]: '0px',
    },
  },
  contactFade: {
    opacity: {
      default: 1,
      [stylex.when.ancestor(':where([data-starting-style], [data-ending-style])', contactItemMarker)]: 0,
      '@media (prefers-reduced-motion: reduce)': {
        default: 1,
        [stylex.when.ancestor(':where([data-starting-style], [data-ending-style])', contactItemMarker)]: 1,
      },
    },
    transform: {
      default: 'scale(1)',
      [stylex.when.ancestor(':where([data-starting-style], [data-ending-style])', contactItemMarker)]: 'scale(0.98)',
      '@media (prefers-reduced-motion: reduce)': {
        default: 'scale(1)',
        [stylex.when.ancestor(':where([data-starting-style], [data-ending-style])', contactItemMarker)]: 'scale(1)',
      },
    },
    transformOrigin: 'left',
    transitionDelay: {
      default: `calc(${durationVars['--cl-duration-base']} + ${durationVars['--cl-duration-slow']})`,
      [stylex.when.ancestor(':where([data-ending-style])', contactItemMarker)]: durationVars['--cl-duration-base'],
    },
    transitionDuration: {
      default: durationVars['--cl-duration-base'],
      [stylex.when.ancestor(':where([data-ending-style])', contactItemMarker)]: durationVars['--cl-duration-fast'],
    },
    transitionProperty: {
      default: 'opacity, transform',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionTimingFunction: {
      default: `${easingVars['--cl-ease-enter']}, ${easingVars['--cl-ease-default']}`,
      [stylex.when.ancestor(':where([data-ending-style])', contactItemMarker)]: easingVars['--cl-ease-exit'],
    },
  },
  badgeSlot: {
    alignItems: 'center',
    display: { default: 'grid', ':empty': 'none' },
    justifyItems: 'start',
  },
  badgeSlotItem: {
    filter: {
      default: 'blur(0)',
      ':where([data-starting-style], [data-ending-style])': 'blur(1px)',
      '@media (prefers-reduced-motion: reduce)': {
        default: 'blur(0)',
        ':where([data-starting-style], [data-ending-style])': 'blur(0)',
      },
    },
    gridColumnStart: '1',
    gridRowStart: '1',
    opacity: { default: 1, ':where([data-starting-style], [data-ending-style])': 0 },
    scale: {
      default: 1,
      ':where([data-starting-style], [data-ending-style])': 0.9,
      '@media (prefers-reduced-motion: reduce)': {
        default: 1,
        ':where([data-starting-style], [data-ending-style])': 1,
      },
    },
    transformOrigin: {
      default: 'center',
      ':where([data-closed])': 'var(--_cl-badge-origin-out, center)',
      ':where([data-open])': 'var(--_cl-badge-origin-in, center)',
    },
    transitionDelay: {
      default: durationVars['--cl-duration-fast'],
      ':where([data-ending-style])': durationVars['--cl-duration-instant'],
    },
    transitionDuration: {
      default: durationVars['--cl-duration-base'],
      ':where([data-ending-style])': durationVars['--cl-duration-fast'],
    },
    transitionProperty: {
      default: 'opacity, scale, filter, translate',
      '@media (prefers-reduced-motion: reduce)': 'opacity',
    },
    transitionTimingFunction: {
      default: `${easingVars['--cl-ease-enter']}, ${easingVars['--cl-ease-default']}, ${easingVars['--cl-ease-enter']}, ${easingVars['--cl-ease-default']}`,
      ':where([data-ending-style])': easingVars['--cl-ease-exit'],
    },
    translate: {
      default: '0 0',
      ':where([data-ending-style])': '0 var(--_cl-badge-shift, 0px)',
      ':where([data-starting-style])': '0 calc(-1 * var(--_cl-badge-shift, 0px))',
      '@media (prefers-reduced-motion: reduce)': {
        default: '0 0',
        ':where([data-starting-style], [data-ending-style])': '0 0',
      },
    },
  },
});

export const badgeShift = stylex.create({
  along: (direction: number) => ({
    '--_cl-badge-origin-in': direction > 0 ? '50% -75%' : direction < 0 ? '50% 175%' : 'center',
    '--_cl-badge-origin-out': direction > 0 ? '50% 175%' : direction < 0 ? '50% -75%' : 'center',
    '--_cl-badge-shift': `${direction * 0.25}rem`,
  }),
});
