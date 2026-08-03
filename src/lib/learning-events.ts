export type LearningEventName =
  | 'coach_prompt_shown'
  | 'coach_prompt_dismissed'
  | 'coach_prompt_ignored'
  | 'coach_opened'
  | 'coach_hidden'
  | 'coach_restored'
  | 'mini_lab_opened'
  | 'lab_suggestion_selected'
  | 'lab_suggestion_applied';

export interface LearningEvent {
  name: LearningEventName;
  labId?: string;
  source?: 'launcher' | 'proactive_prompt' | 'panel' | 'mini_lab';
  suggestionId?: string;
}

declare global {
  interface Window {
    posthog?: { capture: (name: string, properties?: Record<string, string>) => void };
  }
}

export function trackLearningEvent(event: LearningEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('breaking-point:learning-event', { detail: event }));
  const properties = Object.fromEntries(
    Object.entries(event).filter(([key, value]) => key !== 'name' && typeof value === 'string'),
  ) as Record<string, string>;
  window.posthog?.capture(event.name, properties);
}
