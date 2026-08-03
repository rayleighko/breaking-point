import { useState } from 'react';
import '@/styles/sim.css';

interface Q {
  q: string;
  choices: string[];
  answer: number;
  why: string;
}

/** 읽고 넘어가지 않도록 붙잡는 확인 문제. 틀려도 이유를 알려준다. */
export default function Quiz({ items }: { items: Q[] }) {
  return (
    <div className="quiz">
      {items.map((it, i) => (
        <QuizItem key={i} n={i + 1} {...it} />
      ))}
    </div>
  );
}

function QuizItem({ n, q, choices, answer, why }: Q & { n: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  return (
    <div className="quiz-item">
      <div className="quiz-q">
        <b>Q{n}.</b> {q}
      </div>
      <div className="quiz-choices">
        {choices.map((c, i) => {
          const state = !done ? '' : i === answer ? 'right' : i === picked ? 'wrong' : 'off';
          return (
            <button
              key={i}
              className="quiz-choice"
              data-s={state}
              aria-disabled={done}
              onClick={() => {
                if (!done) setPicked(i);
              }}
            >
              <span className="quiz-mark">
                {done
                  ? i === answer
                    ? '✓'
                    : i === picked
                      ? '✕'
                      : ''
                  : String.fromCharCode(65 + i)}
              </span>
              {c}
            </button>
          );
        })}
      </div>
      {done && (
        <div
          className="quiz-why"
          data-s={picked === answer ? 'right' : 'wrong'}
          role="status"
          aria-live="polite"
        >
          <b>{picked === answer ? '정답' : '아쉬워요'}</b> — {why}
        </div>
      )}
    </div>
  );
}
