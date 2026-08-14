# Security policy

## Trust model

This Action receives an LLM token and a GitHub token that can write pull request comments. Pull request content, changed
files, titles, descriptions, and review responses are untrusted data.

The Action therefore:

- checks out review configuration from the trusted base commit;
- never installs dependencies from or executes code from the pull request head;
- passes the base-to-head diff to OpenCodeReview as review data;
- pins `actions/checkout` and OpenCodeReview to full commit SHAs;
- accepts project rules only from a path contained by `GITHUB_WORKSPACE`, including symlink resolution;
- writes the generated rule to `RUNNER_TEMP` and never prints tokens or the complete environment;
- requests only `contents: read` and `pull-requests: write` in documented workflows.

Consumers must not add a PR-head checkout, dependency installation, build, test, or arbitrary script execution to a
`pull_request_target` review job. Run deterministic CI in a separate `pull_request` job without LLM credentials.

## Data flow

Changed code and the supplied background are sent to the configured LLM endpoint. Review JSON and stderr may be uploaded
as GitHub Actions artifacts when `upload_artifacts` is `true`. Do not put secrets, personal data, production request bodies,
or regulated source code into a provider that is not approved to process it.

Use a dedicated LLM project token, provider-side budget cap, short artifact retention, and telemetry disabled by default.

## Reporting

Do not open a public Issue for an exploitable secret or workflow vulnerability. Use the repository Security tab to submit a
private vulnerability report. Include the affected release, event type, minimal reproduction, and expected trust-boundary
violation without including a real credential.
