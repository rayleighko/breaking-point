import { Button } from '@/components/ui/Button';
import { useCoachPreferences } from '@/stores/coach-preferences';

export default function CoachSettings() {
  const enabled = useCoachPreferences((state) => state.enabled);
  const setEnabled = useCoachPreferences((state) => state.setEnabled);
  const setOpen = useCoachPreferences((state) => state.setOpen);
  const setPosition = useCoachPreferences((state) => state.setPosition);

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--bg-card)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <b>전역 Pet Coach</b>
          <p className="mb-0 mt-1 text-sm text-[var(--fg-muted)]">
            현재 상태: {enabled ? '켜짐 · 접힌 상태로 대기' : '꺼짐'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPosition(null);
              setEnabled(true);
              setOpen(true);
            }}
          >
            위치 초기화하고 열기
          </Button>
          <Button variant={enabled ? 'outline' : 'default'} onClick={() => setEnabled(!enabled)}>
            {enabled ? '펫 끄기' : '펫 켜기'}
          </Button>
        </div>
      </div>
    </section>
  );
}
