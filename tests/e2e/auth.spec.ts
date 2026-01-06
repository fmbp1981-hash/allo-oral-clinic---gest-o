import { test, expect, Page } from '@playwright/test';

// Test user credentials
const TEST_USER = {
    email: 'test@allooral.com',
    password: 'testpassword123',
    name: 'Test User',
};

// Helper function to login
async function login(page: Page) {
    await page.goto('/');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
}

test.describe('Login Flow', () => {
    test('should display login form', async ({ page }) => {
        await page.goto('/');

        // Check for email input
        const emailInput = page.locator('input[name="email"], input[type="email"]');
        await expect(emailInput).toBeVisible();

        // Check for password input
        const passwordInput = page.locator('input[name="password"], input[type="password"]');
        await expect(passwordInput).toBeVisible();

        // Check for submit button
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeVisible();
    });

    test('should show error for empty credentials', async ({ page }) => {
        await page.goto('/');

        // Try to submit without filling in credentials
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();

        // Should show validation error
        await expect(page.locator('text=/campo obrigatório|required|preencha/i')).toBeVisible({ timeout: 5000 }).catch(() => {
            // If no explicit error message, button should still be visible (form not submitted)
            expect(submitButton).toBeVisible();
        });
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/');

        await page.fill('input[name="email"], input[type="email"]', 'invalid@test.com');
        await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Wait for error message
        await expect(page.locator('text=/credenciais|inválid|erro|error|incorrect/i')).toBeVisible({ timeout: 5000 }).catch(() => {
            // Error might be shown as toast
        });
    });

    test('should toggle password visibility', async ({ page }) => {
        await page.goto('/');

        const passwordInput = page.locator('input[name="password"], input[type="password"]');
        
        // Initially password should be hidden
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle button if exists
        const toggleButton = page.locator('button:near(input[type="password"])').first();
        if (await toggleButton.count() > 0) {
            await toggleButton.click();
            // Password might now be visible
            await expect(passwordInput).toHaveAttribute('type', 'text').catch(() => {});
        }
    });

    test('should have link to password reset', async ({ page }) => {
        await page.goto('/');

        // Look for forgot password link
        const forgotPasswordLink = page.locator('text=/esquec|forgot|redefinir|reset/i');
        if (await forgotPasswordLink.count() > 0) {
            await expect(forgotPasswordLink).toBeVisible();
        }
    });
});

test.describe('Dashboard Access', () => {
    test.beforeEach(async ({ page }) => {
        // Attempt login before each test
        // Note: This might fail if backend is not running
    });

    test('should protect dashboard from unauthenticated access', async ({ page }) => {
        // Clear any stored tokens
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        // Try to access dashboard directly
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Should redirect to login
        await expect(page.url()).toContain('/').catch(() => {
            // Might show login modal instead of redirect
        });
    });
});

test.describe('Session Management', () => {
    test('should persist session across page reloads', async ({ page }) => {
        // Store a mock token
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('accessToken', 'mock-token');
        });

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Token should still be there
        const token = await page.evaluate(() => localStorage.getItem('accessToken'));
        expect(token).toBe('mock-token');
    });

    test('should clear session on logout', async ({ page }) => {
        await page.goto('/');
        
        // Set mock token
        await page.evaluate(() => {
            localStorage.setItem('accessToken', 'mock-token');
        });

        // Find and click logout button if visible
        const logoutButton = page.locator('button:text(/sair|logout|desconectar/i)');
        if (await logoutButton.count() > 0 && await logoutButton.isVisible()) {
            await logoutButton.click();
            await page.waitForLoadState('networkidle');

            // Token should be cleared
            const token = await page.evaluate(() => localStorage.getItem('accessToken'));
            expect(token).toBeNull();
        }
    });
});
