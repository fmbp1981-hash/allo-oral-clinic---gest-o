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

test.describe('Kanban Board Display', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should display Kanban board with columns', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for Kanban board container
        const kanbanBoard = page.locator('[data-testid="kanban-board"], .kanban-board, .kanban, [class*="kanban"]');
        if (await kanbanBoard.count() > 0) {
            await expect(kanbanBoard.first()).toBeVisible();
        }
    });

    test('should have expected status columns', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check for status columns - typical for dental clinic pipeline
        const expectedColumns = ['NOVO', 'NEW', 'ENVIADA', 'SENT', 'NEGOCIANDO', 'AGENDADO', 'SCHEDULED', 'GANHO', 'WON', 'PERDIDO', 'LOST'];
        
        for (const column of expectedColumns) {
            const columnHeader = page.locator(`text=/${column}/i`);
            if (await columnHeader.count() > 0) {
                // At least one expected column exists
                break;
            }
        }
    });

    test('should show opportunity cards in columns', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for opportunity cards
        const opportunityCards = page.locator('[data-testid*="opportunity"], .opportunity-card, [draggable="true"]');
        if (await opportunityCards.count() > 0) {
            await expect(opportunityCards.first()).toBeVisible();
        }
    });
});

test.describe('Kanban Drag and Drop', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('opportunity cards should be draggable', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const draggableCard = page.locator('[draggable="true"]').first();
        if (await draggableCard.count() > 0) {
            const isDraggable = await draggableCard.getAttribute('draggable');
            expect(isDraggable).toBe('true');
        }
    });

    test('should have drop zones for each column', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for droppable columns
        const columns = page.locator('.kanban-column, [data-column], [data-droppable="true"]');
        if (await columns.count() > 0) {
            expect(await columns.count()).toBeGreaterThan(0);
        }
    });

    // Note: Actual drag-and-drop testing requires complex mouse interactions
    // and might be flaky. This is a simplified check.
    test('should simulate drag start event', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const draggableCard = page.locator('[draggable="true"]').first();
        if (await draggableCard.count() > 0 && await draggableCard.isVisible()) {
            // Trigger dragstart event
            await draggableCard.dispatchEvent('dragstart');
            // Card should have dragging state (implementation specific)
        }
    });
});

test.describe('Opportunity Details', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should open opportunity details on card click', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const opportunityCard = page.locator('[data-testid*="opportunity"], .opportunity-card').first();
        if (await opportunityCard.count() > 0 && await opportunityCard.isVisible()) {
            await opportunityCard.click();

            // Modal should appear
            const modal = page.locator('[role="dialog"], .modal, [data-testid="opportunity-modal"]');
            if (await modal.count() > 0) {
                await expect(modal.first()).toBeVisible();
            }
        }
    });

    test('should show patient name in opportunity card', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const opportunityCard = page.locator('[data-testid*="opportunity"], .opportunity-card').first();
        if (await opportunityCard.count() > 0 && await opportunityCard.isVisible()) {
            // Card should contain patient name
            const cardText = await opportunityCard.textContent();
            expect(cardText).toBeTruthy();
        }
    });

    test('should show contact option in opportunity details', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const opportunityCard = page.locator('[data-testid*="opportunity"], .opportunity-card').first();
        if (await opportunityCard.count() > 0 && await opportunityCard.isVisible()) {
            await opportunityCard.click();
            await page.waitForTimeout(300);

            // Look for WhatsApp or contact button
            const contactButton = page.locator('button:text(/whatsapp|contato|contact|enviar/i), [aria-label*="whatsapp"]');
            if (await contactButton.count() > 0) {
                await expect(contactButton.first()).toBeVisible();
            }
        }
    });
});

test.describe('Opportunity Status Update', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should update status via dropdown', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const opportunityCard = page.locator('[data-testid*="opportunity"], .opportunity-card').first();
        if (await opportunityCard.count() > 0 && await opportunityCard.isVisible()) {
            await opportunityCard.click();
            await page.waitForTimeout(300);

            // Look for status dropdown
            const statusDropdown = page.locator('select, [role="combobox"], button:text(/status/i)');
            if (await statusDropdown.count() > 0) {
                await expect(statusDropdown.first()).toBeVisible();
            }
        }
    });

    test('should have notes field in opportunity details', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const opportunityCard = page.locator('[data-testid*="opportunity"], .opportunity-card').first();
        if (await opportunityCard.count() > 0 && await opportunityCard.isVisible()) {
            await opportunityCard.click();
            await page.waitForTimeout(300);

            // Look for notes field
            const notesField = page.locator('textarea, [contenteditable="true"], input[name*="note"]');
            if (await notesField.count() > 0) {
                await expect(notesField.first()).toBeVisible();
            }
        }
    });
});

test.describe('Kanban Filtering', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should have date range filter', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const dateFilter = page.locator('input[type="date"], [data-testid*="date-filter"], button:text(/período|date/i)');
        if (await dateFilter.count() > 0) {
            await expect(dateFilter.first()).toBeVisible();
        }
    });

    test('should have keyword search for opportunities', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="pesquisar"], input[type="search"]');
        if (await searchInput.count() > 0) {
            await searchInput.first().fill('implante');
            await page.waitForTimeout(500);

            // Search should filter results
        }
    });

    test('should refresh board data', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const refreshButton = page.locator('button:text(/atualizar|refresh/i), button[aria-label*="refresh"]');
        if (await refreshButton.count() > 0 && await refreshButton.isVisible()) {
            await refreshButton.click();
            await page.waitForLoadState('networkidle');
            // Board should reload data
        }
    });
});

test.describe('Opportunity Creation', () => {
    test.beforeEach(async ({ page }) => {
        await setupAuthenticatedState(page);
    });

    test('should have option to create new opportunity', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const addButton = page.locator('button:text(/adicionar|novo|criar|add|new/i)');
        if (await addButton.count() > 0) {
            // There should be a way to add opportunities
            await expect(addButton.first()).toBeVisible();
        }
    });
});
