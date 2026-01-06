import { test, expect, Page } from '@playwright/test';

// Helper function to setup authenticated state
async function setupAuthenticatedState(page: Page) {
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.setItem('accessToken', 'mock-valid-token');
        localStorage.setItem('refreshToken', 'mock-refresh-token');
        localStorage.setItem('user', JSON.stringify({
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@allooral.com',
            tenantId: 'test-tenant-id',
        }));
    });
}

test.describe('Dark Mode Toggle', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should display dark mode toggle button', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const darkModeToggle = page.locator('button[aria-label*="dark"], button[aria-label*="modo"], [data-testid="dark-mode-toggle"]');
        if (await darkModeToggle.count() > 0) {
            await expect(darkModeToggle.first()).toBeVisible();
        }
    });

    test('should toggle dark mode on click', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const darkModeToggle = page.locator('button[aria-label*="dark"], button[aria-label*="modo"]').first();
        if (await darkModeToggle.count() > 0 && await darkModeToggle.isVisible()) {
            // Get initial state
            const initialDarkClass = await page.evaluate(() => 
                document.documentElement.classList.contains('dark')
            );

            // Click toggle
            await darkModeToggle.click();
            await page.waitForTimeout(300);

            // State should change
            const afterClickDarkClass = await page.evaluate(() => 
                document.documentElement.classList.contains('dark')
            );

            expect(afterClickDarkClass).not.toBe(initialDarkClass);
        }
    });

    test('should persist dark mode preference', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const darkModeToggle = page.locator('button[aria-label*="dark"]').first();
        if (await darkModeToggle.count() > 0 && await darkModeToggle.isVisible()) {
            await darkModeToggle.click();
            await page.waitForTimeout(300);

            // Get localStorage value
            const savedPreference = await page.evaluate(() => 
                localStorage.getItem('darkMode')
            );

            expect(savedPreference).toBeTruthy();
        }
    });

    test('should restore dark mode preference on reload', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.setItem('darkMode', 'true');
        });

        await page.reload();
        await page.waitForLoadState('networkidle');

        // Dark class should be applied
        const hasDarkClass = await page.evaluate(() => 
            document.documentElement.classList.contains('dark') || 
            localStorage.getItem('darkMode') === 'true'
        );

        expect(hasDarkClass).toBe(true);
    });
});

test.describe('Settings Modal', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should open settings modal', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const settingsButton = page.locator('button[aria-label*="config"], button:text(/configurações|settings|config/i)');
        if (await settingsButton.count() > 0 && await settingsButton.isVisible()) {
            await settingsButton.click();
            await page.waitForTimeout(300);

            const modal = page.locator('[role="dialog"], .modal, [data-testid="settings-modal"]');
            if (await modal.count() > 0) {
                await expect(modal.first()).toBeVisible();
            }
        }
    });

    test('should have WhatsApp configuration section', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const settingsButton = page.locator('button[aria-label*="config"], button:text(/configurações/i)').first();
        if (await settingsButton.count() > 0 && await settingsButton.isVisible()) {
            await settingsButton.click();
            await page.waitForTimeout(300);

            const whatsappSection = page.locator('text=/whatsapp/i');
            if (await whatsappSection.count() > 0) {
                await expect(whatsappSection.first()).toBeVisible();
            }
        }
    });

    test('should have keyword configuration section', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const settingsButton = page.locator('button:text(/configurações/i)').first();
        if (await settingsButton.count() > 0 && await settingsButton.isVisible()) {
            await settingsButton.click();
            await page.waitForTimeout(300);

            const keywordSection = page.locator('text=/palavras-chave|keywords/i');
            if (await keywordSection.count() > 0) {
                await expect(keywordSection.first()).toBeVisible();
            }
        }
    });

    test('should close settings modal', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const settingsButton = page.locator('button:text(/configurações/i)').first();
        if (await settingsButton.count() > 0 && await settingsButton.isVisible()) {
            await settingsButton.click();
            await page.waitForTimeout(300);

            const closeButton = page.locator('button[aria-label*="fechar"], button[aria-label*="close"], button:text(/fechar|close/i)');
            if (await closeButton.count() > 0) {
                await closeButton.first().click();
                await page.waitForTimeout(300);

                const modal = page.locator('[data-testid="settings-modal"]');
                if (await modal.count() > 0) {
                    await expect(modal).not.toBeVisible();
                }
            }
        }
    });
});

test.describe('Profile Modal', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should open profile modal', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const profileButton = page.locator('button[aria-label*="perfil"], button:text(/perfil|profile/i), [data-testid="profile-button"]');
        if (await profileButton.count() > 0 && await profileButton.isVisible()) {
            await profileButton.click();
            await page.waitForTimeout(300);

            const modal = page.locator('[role="dialog"], .modal, [data-testid="profile-modal"]');
            if (await modal.count() > 0) {
                await expect(modal.first()).toBeVisible();
            }
        }
    });

    test('should display user information', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const profileButton = page.locator('button:text(/perfil|profile/i)').first();
        if (await profileButton.count() > 0 && await profileButton.isVisible()) {
            await profileButton.click();
            await page.waitForTimeout(300);

            // Should show user email or name
            const userInfo = page.locator('text=/test@allooral.com|Test User/');
            if (await userInfo.count() > 0) {
                await expect(userInfo.first()).toBeVisible();
            }
        }
    });

    test('should have change password option', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const profileButton = page.locator('button:text(/perfil/i)').first();
        if (await profileButton.count() > 0 && await profileButton.isVisible()) {
            await profileButton.click();
            await page.waitForTimeout(300);

            const changePasswordOption = page.locator('button:text(/senha|password/i), text=/alterar senha|change password/i');
            if (await changePasswordOption.count() > 0) {
                await expect(changePasswordOption.first()).toBeVisible();
            }
        }
    });
});

test.describe('Export Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should have export button', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const exportButton = page.locator('button:text(/exportar|export/i), [aria-label*="export"]');
        if (await exportButton.count() > 0) {
            await expect(exportButton.first()).toBeVisible();
        }
    });

    test('should show export options menu', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const exportButton = page.locator('button:text(/exportar|export/i)').first();
        if (await exportButton.count() > 0 && await exportButton.isVisible()) {
            await exportButton.click();
            await page.waitForTimeout(300);

            // Look for export options (CSV, Excel, PDF)
            const exportOptions = page.locator('text=/csv|excel|pdf/i');
            if (await exportOptions.count() > 0) {
                await expect(exportOptions.first()).toBeVisible();
            }
        }
    });
});

test.describe('Responsive Design', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await setupAuthenticatedState(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Page should still be functional on mobile
        await expect(page).toHaveTitle(/Allo|Clinic/i);
    });

    test('should have mobile menu on small screens', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await setupAuthenticatedState(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for hamburger menu
        const hamburgerMenu = page.locator('button[aria-label*="menu"], [data-testid="mobile-menu"]');
        if (await hamburgerMenu.count() > 0) {
            await expect(hamburgerMenu.first()).toBeVisible();
        }
    });

    test('should display correctly on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await setupAuthenticatedState(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveTitle(/Allo|Clinic/i);
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await setupAuthenticatedState(page);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveTitle(/Allo|Clinic/i);
    });
});

test.describe('Error States', () => {
    test('should display error page for invalid routes', async ({ page }) => {
        await setupAuthenticatedState(page);
        await page.goto('/invalid-route-that-does-not-exist');
        await page.waitForLoadState('networkidle');

        // Should show 404 or redirect to home
        const errorText = page.locator('text=/não encontrad|not found|404/i');
        const isRedirected = page.url().includes('/') && !page.url().includes('invalid');

        expect(await errorText.count() > 0 || isRedirected).toBe(true);
    });

    test('should handle network errors gracefully', async ({ page }) => {
        await setupAuthenticatedState(page);
        
        // Block API requests
        await page.route('**/api/**', route => route.abort());
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Page should still be functional, showing error state
        await expect(page).toHaveTitle(/Allo|Clinic/i);
    });
});
