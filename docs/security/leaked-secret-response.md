# Leaked Secret Response

Use this checklist when a credential, token, API key, password, or private key is committed or exposed.

## Immediate response

1. Treat the secret as compromised immediately.
2. Identify the secret type, provider, repository, file, line, commit, and owner.
3. Check whether the secret is active, public, production-scoped, or used by running services.
4. Revoke the exposed credential at the provider. If downtime matters, create a replacement first, update the app, then revoke the old value.
5. Rotate every dependent credential or GitHub secret that may have been exposed.
6. Update affected services to use the new secret from a safe store, such as GitHub Actions secrets or an external vault.
7. Review GitHub audit logs and provider logs for unauthorized use.
8. Remove the secret from the current code and configuration.
9. Decide with maintainers whether rewriting Git history is required. Rewriting history is disruptive, so revoke or rotate first.
10. Close the GitHub secret scanning alert as revoked after remediation is complete.
11. Document what happened, impact, remediation, and prevention steps.

## Secret scanning setup

Enable GitHub Secret Protection from the repository settings:

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Open **Advanced Security** under **Security and quality**.
4. Enable **Secret Protection**.
5. Confirm secret scanning alerts are visible under **Security**.

Public repositories receive secret scanning support for free. Private repository availability depends on the GitHub plan and organization or enterprise settings.

## Prevention

- Keep real credentials out of source control.
- Use `.env` files locally and keep them ignored by Git.
- Store CI/CD credentials in GitHub Actions secrets or a vault.
- Review PRs for hard-coded credentials.
- Keep the PR checklist item for secrets checked before merge.
- Rotate credentials regularly and prefer short-lived tokens where possible.
