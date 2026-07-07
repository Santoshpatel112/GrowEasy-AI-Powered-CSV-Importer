import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AIService } from '../services/ai.js';
describe('GrowEasy CSV Importer AI Service tests', () => {
    const aiService = new AIService();
    test('Mock Mapping maps correct fields', async () => {
        const rawRows = [
            {
                'Full Name': 'John Doe',
                'Email Address': 'john.doe@example.com',
                'Mobile No': '9876543210',
                'Company Name': 'GrowEasy',
                'City Name': 'Mumbai',
                'Source': 'leads_on_demand',
                'Remarks': 'Client wants a callback'
            }
        ];
        const headers = Object.keys(rawRows[0]);
        const result = await aiService.processBatch(rawRows, headers);
        assert.strictEqual(result.imported.length, 1);
        assert.strictEqual(result.skipped.length, 0);
        const lead = result.imported[0];
        assert.strictEqual(lead.name, 'John Doe');
        assert.strictEqual(lead.email, 'john.doe@example.com');
        assert.strictEqual(lead.company, 'GrowEasy');
        assert.strictEqual(lead.city, 'Mumbai');
        assert.strictEqual(lead.data_source, 'leads_on_demand');
        assert.match(lead.crm_note, /Client wants a callback/);
    });
    test('Skip records missing both email and phone number', async () => {
        const rawRows = [
            {
                'Full Name': 'Invalid Lead',
                'Company Name': 'No Contact Info',
                'City Name': 'Delhi',
                'Remarks': 'No email and no phone'
            }
        ];
        const headers = Object.keys(rawRows[0]);
        const result = await aiService.processBatch(rawRows, headers);
        assert.strictEqual(result.imported.length, 0);
        assert.strictEqual(result.skipped.length, 1);
        assert.match(result.skipped[0].reason, /neither email nor mobile/);
    });
    test('Multiple emails or phone numbers are concatenated to crm_note', async () => {
        const rawRows = [
            {
                'Name': 'Multi Contact',
                'Email': 'primary@example.com',
                'Secondary Email': 'secondary@example.com',
                'Phone': '9876543210',
                'Alt Phone': '1234567890'
            }
        ];
        const headers = Object.keys(rawRows[0]);
        const result = await aiService.processBatch(rawRows, headers);
        assert.strictEqual(result.imported.length, 1);
        const lead = result.imported[0];
        assert.strictEqual(lead.email, 'primary@example.com');
        assert.match(lead.crm_note, /secondary@example.com/);
        assert.match(lead.crm_note, /1234567890/);
    });
});
