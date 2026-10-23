# Contributing and PR quality gates

Every change must go through a pull request into `main`. Do not merge a change merely because the deployment preview is green.

## Required review sequence

1. **CodeRabbit**: obtain an independent automated review; inspect every finding and fix valid issues or document why a finding is not applicable.
2. **CodeQL**: run static security analysis and resolve alerts introduced by the change.
3. **CI**: pass the applicable build and test workflows.
4. **Maintainer review**: inspect the complete diff, validate the behavior, and check that the change fits the product scope and visual system.
5. **Preview verification**: verify the preview for user-facing changes before merging.
6. **Merge gate**: merge only after applicable checks are successful and unresolved high-severity findings are addressed.

## Important

The `.coderabbit.yaml` file configures CodeRabbit but does not install its GitHub App. A repository administrator must install/authorize CodeRabbit for this repository and confirm reviews appear on PRs.

The CodeQL workflow requires GitHub Actions to be enabled and the repository plan/settings to permit CodeQL code scanning. Confirm the first workflow run succeeds and that code scanning alerts are available.

Configure GitHub branch protection or a repository ruleset for `main` to require the applicable status checks and approvals. A workflow file alone does not prevent merging when checks are pending or failing. Until those repository-level protections and the CodeRabbit integration are verified, do not claim that the gates are enforced.
