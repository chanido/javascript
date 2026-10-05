import * as stylex from '@stylexjs/stylex';

import { durationVars, easingVars, space } from '../../../tokens.stylex';
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
    overflow: 'clip',
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
      default: durationVars['--cl-duration-slow'],
      [stylex.when.ancestor(':where([data-ending-style])', contactItemMarker)]: durationVars['--cl-duration-instant'],
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
  primaryBadge: {
    opacity: { default: 1, ':where([data-starting-style], [data-ending-style])': 0 },
    transform: {
      default: 'scale(1)',
      ':where([data-starting-style], [data-ending-style])': 'scale(0.9)',
      '@media (prefers-reduced-motion: reduce)': {
        default: 'scale(1)',
        ':where([data-starting-style], [data-ending-style])': 'scale(1)',
      },
    },
    transitionDuration: {
      default: durationVars['--cl-duration-base'],
      ':where([data-ending-style])': durationVars['--cl-duration-fast'],
    },
    transitionProperty: {
      default: 'opacity, transform',
      '@media (prefers-reduced-motion: reduce)': 'opacity',
    },
    transitionTimingFunction: {
      default: `${easingVars['--cl-ease-enter']}, ${easingVars['--cl-ease-default']}`,
      ':where([data-ending-style])': easingVars['--cl-ease-exit'],
    },
  },
});
