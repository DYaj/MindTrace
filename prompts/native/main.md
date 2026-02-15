# MindTrace Prompt — Style 1 (Playwright Native)

## Required Configuration
- You must set `BASE_URL` before running tests.
- Setup script writes it to the repo root `.env`.
- Runtime reads it via `process.env.BASE_URL`.

Example:
BASE_URL=https://practicetestautomation.com/practice-test-login/

## Goal
Generate Playwright-native tests that:
- Navigate using Playwright `baseURL` (`process.env.BASE_URL`)
- Avoid hardcoded localhost URLs
- Produce stable selectors and clear assertions
