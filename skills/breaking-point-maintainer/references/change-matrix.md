# Change evidence matrix

| Change            | Read first                    | Minimum evidence                               |
| ----------------- | ----------------------------- | ---------------------------------------------- |
| Lab prose or MDX  | `CONTENT_GUIDE.md`            | content checklist, build, browser reading flow |
| Simulation engine | `docs/ENGINE_GUIDE.md`        | invariant, seed reproducibility, `pnpm test`   |
| Challenge         | `CONTENT_GUIDE.md`            | naive fail and intended pass script            |
| React/Astro/CSS   | `docs/FRONTEND_GUIDELINES.md` | lint, type, build, browser, 375px overflow     |
| Local Lab/CLI     | `docs/CLI_VISION.md`          | bounded resources, cleanup, result provenance  |
| GitHub workflow   | workflow and package scripts  | local equivalent of every CI command           |
| Architecture      | `docs/ARCHITECTURE.md`        | affected boundary and migration path           |

For every change, finish with `pnpm quality` unless the environment makes a step impossible. Record the exact missing step
and reason instead of weakening the gate.
