/**
 * Interview Components — Production Live Interview UI
 * 
 * 30-Year Veteran Principles:
 * 1. Single focal point (suggestion area)
 * 2. Fixed zones — nothing moves
 * 3. Calm under pressure — no alarming colors
 * 4. Zero cognitive overload
 * 
 * Usage:
 * import { InterviewPage, useInterview, useAudio } from '@/components/interview';
 */

// Main Page Component
export { default as InterviewPage } from './InterviewPage';

// State Management Hook
export { useInterview } from './useInterview';

// Audio Management Hook
export { useAudio } from './useAudio';

// Failure State Components
export {
  FailureBanner,
  ConnectionStatusPill,
  Toast,
  RecoveryOverlay,
  type FailureState,
} from './FailureStates';
