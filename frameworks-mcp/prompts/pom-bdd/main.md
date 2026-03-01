# MindTrace Prompt — Style 3 (Playwright + POM + Cucumber)

## Required Configuration
- You must set `BASE_URL` before running tests.
- Setup script writes it to the repo root `.env`.
- Cucumber support code loads `../../.env` and navigates to `BASE_URL` in hooks.

Example:
BASE_URL=https://practicetestautomation.com/practice-test-login/

## Goal
Generate POM + BDD tests that:
- Use `.feature` files + TS step definitions
- Navigate using `BASE_URL` (no hardcoded localhost)
- Prefer Page Objects for maintainability
