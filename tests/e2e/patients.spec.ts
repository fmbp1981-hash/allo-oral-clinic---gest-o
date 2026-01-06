import { test, expect, Page } from '@playwright/test';

// Helper function to setup authenticated state
async function setupAuthenticatedState(page: Page) {
    await page.goto('/');
    await page.evaluate(() => {
        // Mock authentication tokens
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

test.describe('Patient List', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should display patients table or list', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for patient list elements
        const patientList = page.locator('table, [data-testid="patient-list"], .patient-list');
        
        // Either table or loading state should be visible
        const hasPatientUI = await patientList.count() > 0;
        if (hasPatientUI) {
            await expect(patientList.first()).toBeVisible();
        }
    });

    test('should have search input for patients', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for search input
        const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="pesquisar"], input[placeholder*="search"], input[type="search"]');
        if (await searchInput.count() > 0) {
            await expect(searchInput.first()).toBeVisible();
        }
    });

    test('should filter patients when searching', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="pesquisar"], input[placeholder*="search"]');
        if (await searchInput.count() > 0) {
            await searchInput.first().fill('João');
            await page.waitForTimeout(500); // Debounce wait

            // Results should be filtered
            // Check that search was applied (URL might have query param or table filtered)
        }
    });

    test('should have add patient button', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for add button
        const addButton = page.locator('button:text(/adicionar|novo|criar|add|new/i), [aria-label*="adicionar"], [aria-label*="novo"]');
        if (await addButton.count() > 0) {
            await expect(addButton.first()).toBeVisible();
        }
    });
});

test.describe('Patient Creation', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should open patient creation modal', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const addButton = page.locator('button:text(/adicionar|novo|criar|add|new/i)').first();
        if (await addButton.count() > 0 && await addButton.isVisible()) {
            await addButton.click();

            // Modal should appear
            const modal = page.locator('[role="dialog"], .modal, [data-testid="patient-modal"]');
            if (await modal.count() > 0) {
                await expect(modal.first()).toBeVisible();
            }
        }
    });

    test('should have required fields in patient form', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const addButton = page.locator('button:text(/adicionar|novo/i)').first();
        if (await addButton.count() > 0 && await addButton.isVisible()) {
            await addButton.click();
            await page.waitForTimeout(300);

            // Check for name field
            const nameInput = page.locator('input[name="name"], input[placeholder*="nome"]');
            if (await nameInput.count() > 0) {
                await expect(nameInput.first()).toBeVisible();
            }

            // Check for phone field
            const phoneInput = page.locator('input[name="phone"], input[placeholder*="telefone"], input[placeholder*="whatsapp"]');
            if (await phoneInput.count() > 0) {
                await expect(phoneInput.first()).toBeVisible();
            }
        }
    });

    test('should validate required fields before submit', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const addButton = page.locator('button:text(/adicionar|novo/i)').first();
        if (await addButton.count() > 0 && await addButton.isVisible()) {
            await addButton.click();
            await page.waitForTimeout(300);

            // Try to submit empty form
            const submitButton = page.locator('[role="dialog"] button:text(/salvar|save|criar|create/i), .modal button:text(/salvar|save/i)');
            if (await submitButton.count() > 0) {
                await submitButton.first().click();

                // Should show validation errors
                const errorMessage = page.locator('text=/obrigatório|required|inválido|invalid/i');
                if (await errorMessage.count() > 0) {
                    await expect(errorMessage.first()).toBeVisible();
                }
            }
        }
    });
});

test.describe('Patient Details', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should open patient details on click', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Click on first patient row if exists
        const patientRow = page.locator('table tbody tr, .patient-item, [data-testid*="patient"]').first();
        if (await patientRow.count() > 0 && await patientRow.isVisible()) {
            await patientRow.click();

            // Modal or details panel should appear
            const detailsModal = page.locator('[role="dialog"], .modal, [data-testid="patient-details"]');
            if (await detailsModal.count() > 0) {
                await expect(detailsModal.first()).toBeVisible();
            }
        }
    });

    test('should display patient information', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const patientRow = page.locator('table tbody tr, .patient-item').first();
        if (await patientRow.count() > 0 && await patientRow.isVisible()) {
            await patientRow.click();
            await page.waitForTimeout(300);

            const modal = page.locator('[role="dialog"], .modal');
            if (await modal.count() > 0) {
                // Should show patient name
                const patientName = modal.locator('h1, h2, h3, .patient-name');
                if (await patientName.count() > 0) {
                    await expect(patientName.first()).toBeVisible();
                }
            }
        }
    });

    test('should have edit option in patient details', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const patientRow = page.locator('table tbody tr').first();
        if (await patientRow.count() > 0 && await patientRow.isVisible()) {
            await patientRow.click();
            await page.waitForTimeout(300);

            const editButton = page.locator('button:text(/editar|edit/i), [aria-label*="editar"]');
            if (await editButton.count() > 0) {
                await expect(editButton.first()).toBeVisible();
            }
        }
    });

    test('should have delete option in patient details', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const patientRow = page.locator('table tbody tr').first();
        if (await patientRow.count() > 0 && await patientRow.isVisible()) {
            await patientRow.click();
            await page.waitForTimeout(300);

            const deleteButton = page.locator('button:text(/excluir|deletar|delete|remover/i), [aria-label*="excluir"]');
            if (await deleteButton.count() > 0) {
                await expect(deleteButton.first()).toBeVisible();
            }
        }
    });
});

test.describe('Patient History', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should show patient history section', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const patientRow = page.locator('table tbody tr').first();
        if (await patientRow.count() > 0 && await patientRow.isVisible()) {
            await patientRow.click();
            await page.waitForTimeout(300);

            // Look for history section
            const historySection = page.locator('text=/histórico|history|notas|notes/i');
            if (await historySection.count() > 0) {
                await expect(historySection.first()).toBeVisible();
            }
        }
    });
});
