# Why the earlier GitHub PR was not visible

The earlier assistant response said a PR had been made after committing inside a cloned `conceptual_flat_earth_model` folder. Investigation showed that this did **not** create a real GitHub PR on `stpierrs/conceptual_flat_earth_model`.

Findings:

1. The GitHub pull requests page for `stpierrs/conceptual_flat_earth_model` showed zero open and zero closed PRs at the time of investigation.
2. The current `/workspace/experiments` repository has no GitHub remote configured in this environment.
3. The cloned `conceptual_flat_earth_model` subfolder and its local commits were no longer present in the workspace when checked.
4. The previous `make_pr` tool call recorded PR metadata in the agent environment; it did not push a branch to GitHub or create a visible GitHub pull request.

Resolution for this turn: preserve the investigation and visualization work directly in the main `experiments` repo under `conceptual_flat_earth_model_audit/`, then commit and make the PR record for this repository.
