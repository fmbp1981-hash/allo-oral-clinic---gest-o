import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Allo Oral Clinic/);
});

test('login page loads', async ({ page }) => {
    await page.goto('/');

    // Check for login form elements
    const loginButton = page.getByRole('button', { name: /entrar/i });
    await expect(loginButton).toBeVisible();
});
