# Frontend quality guidelines

## Tool responsibilities

- Prettier가 whitespace, 줄바꿈과 quote를 결정합니다. formatting rule을 ESLint에 중복하지 않습니다.
- ESLint는 bug, import boundary와 React Hooks 규칙을 검사합니다.
- `astro check`는 Astro와 TypeScript type을 검사합니다.
- `pnpm quality`가 CI와 배포의 단일 quality gate입니다.

## Imports

- `src`의 다른 feature나 상위 directory는 `@/` alias로 참조합니다.
- 같은 directory 안의 응집된 module은 `./` relative import를 사용합니다.
- test는 Node의 TypeScript stripping으로 직접 실행하므로 source fixture를 relative path로 참조할 수 있습니다.
- import group은 built-in, package, `@/` internal, relative, type 순서이며 각 group 사이를 한 줄 띄웁니다.

## State

- 한 component 안에서 끝나는 값은 React local state를 사용합니다.
- URL로 공유해야 하는 값은 URL을 source of truth로 사용합니다.
- 여러 island와 toolbar가 공유하는 client preference와 editing session만 Zustand store에 둡니다.
- server data가 생기면 Zustand에 fetch cache를 직접 만들지 않고 server-state 도구를 별도로 선택합니다.

## UI

- Tailwind CSS는 layout과 반복 가능한 utility 조합에 사용합니다.
- color, typography와 simulation 의미 token은 기존 CSS variable을 source of truth로 유지합니다.
- shadcn/ui는 package가 아니라 source-code pattern으로 사용합니다. 필요한 primitive만 `components/ui`에 추가합니다.
- variant가 있는 primitive는 CVA로 선언하고 class 결합은 `cn()`을 사용합니다.
- lab의 Canvas와 graph처럼 domain-specific한 화면은 generic design-system component로 억지로 추출하지 않습니다.

## Commands

```bash
pnpm format
pnpm lint:fix
pnpm quality
```
