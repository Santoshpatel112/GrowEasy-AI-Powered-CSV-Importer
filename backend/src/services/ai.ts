import { GoogleGenAI, Type, Schema } from '@google/genai';
import { OpenAI } from 'openai';
import { RawRow, CRMLead, SkippedRecord } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Define schema for Gemini structured JSON output
const crmLeadSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    created_at: { type: Type.STRING, description: 'Lead creation date (convert to standard format like YYYY-MM-DD HH:mm:ss if possible, must be parseable by Javascript new Date())' },
    name: { type: Type.STRING, description: 'Lead full name' },
    email: { type: Type.STRING, description: 'Primary email address' },
    country_code: { type: Type.STRING, description: 'Country dial code (e.g. +91, +1, +44)' },
    mobile_without_country_code: { type: Type.STRING, description: 'Mobile number (numeric only, without the country dial code or leading zeros)' },
    company: { type: Type.STRING, description: 'Company name' },
    city: { type: Type.STRING, description: 'City name' },
    state: { type: Type.STRING, description: 'State or region name' },
    country: { type: Type.STRING, description: 'Country name' },
    lead_owner: { type: Type.STRING, description: 'Owner of the lead / sales rep email' },
    crm_status: {
      type: Type.STRING,
      enum: ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'],
      description: 'Lead status. Must be strictly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE'
    },
    crm_note: { type: Type.STRING, description: 'Notes, remarks, follow-up comments, secondary emails, secondary mobile numbers, or any additional context that does not map to other fields' },
    data_source: {
      type: Type.STRING,
      enum: ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots', ''],
      description: 'Data source. Must be one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or empty string if not matched.'
    },
    possession_time: { type: Type.STRING, description: 'Property possession time or timeline' },
    description: { type: Type.STRING, description: 'Additional description of the lead requirements' }
  },
  required: [
    'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code',
    'company', 'city', 'state', 'country', 'lead_owner', 'crm_status',
    'crm_note', 'data_source', 'possession_time', 'description'
  ]
};

const geminiResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          success: { type: Type.BOOLEAN, description: 'True if mapped successfully, False if skipped due to missing email and mobile/phone' },
          skip_reason: { type: Type.STRING, description: 'Reason for skipping the record, empty if success is True. Must skip if record contains neither an email nor mobile number' },
          lead: crmLeadSchema
        },
        required: ['success', 'skip_reason']
      }
    }
  },
  required: ['results']
};

interface AIServiceResult {
  imported: CRMLead[];
  skipped: SkippedRecord[];
}

export class AIService {
  private geminiClient: GoogleGenAI | null = null;
  private openaiClient: OpenAI | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      this.geminiClient = new GoogleGenAI({ apiKey: geminiKey });
    }
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
    }

    if (!this.geminiClient && !this.openaiClient) {
      console.warn('Warning: Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in the environment. Mappings will run in dry-run/mock mode.');
    }
  }

  /**
   * Processes a batch of raw CSV rows using the configured AI service
   */
  async processBatch(rows: RawRow[], headers: string[]): Promise<AIServiceResult> {
    if (!this.geminiClient && !this.openaiClient) {
      return this.mockProcessBatch(rows);
    }

    const systemPrompt = `You are an expert CRM lead ingestion assistant.
Your task is to analyze a batch of raw rows from a CSV file and map them into the GrowEasy CRM schema.
CSV Headers available in this file: [${headers.join(', ')}].

CRITICAL Rules:
1. Identify the appropriate fields from the raw row keys and values to map them to the CRM schema.
2. If a record contains NEITHER an email NOR a mobile/phone number, you MUST skip that record (success = false, skip_reason = "Missing both email and mobile number").
3. crm_status MUST be strictly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE.
4. data_source MUST be strictly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or empty string.
5. created_at must be formatted such that it can be parsed with JS: new Date(created_at) is valid. If no date is found, use the current date/time in YYYY-MM-DD HH:mm:ss format.
6. If multiple emails exist, use the first as email and append the others to crm_note.
7. If multiple mobile numbers exist, use the first as mobile_without_country_code and append the rest to crm_note.
8. Use crm_note for remarks, follow-ups, additional phones/emails, or any other unmapped helpful data.
9. Extract country_code (e.g. +91, +1) separately from the mobile number if possible. mobile_without_country_code must not contain the country code.
10. Ensure the output fits the requested JSON schema.`;

    const userPrompt = `Here is the batch of raw CSV rows to map:
${JSON.stringify(rows, null, 2)}`;

    try {
      if (this.geminiClient) {
        return await this.processWithGemini(systemPrompt, userPrompt, rows);
      } else {
        return await this.processWithOpenAI(systemPrompt, userPrompt, rows);
      }
    } catch (error) {
      console.error('Error during AI batch processing:', error);
      throw error;
    }
  }

  private async processWithGemini(systemPrompt: string, userPrompt: string, originalRows: RawRow[]): Promise<AIServiceResult> {
    if (!this.geminiClient) throw new Error('Gemini client not initialized');

    const response = await this.geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: geminiResponseSchema,
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response received from Gemini API');
    }

    const data = JSON.parse(text);
    return this.parseAIResponse(data, originalRows);
  }

  private async processWithOpenAI(systemPrompt: string, userPrompt: string, originalRows: RawRow[]): Promise<AIServiceResult> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized');

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const text = response.choices[0].message.content;
    if (!text) {
      throw new Error('Empty response received from OpenAI API');
    }

    const data = JSON.parse(text);
    return this.parseAIResponse(data, originalRows);
  }

  private parseAIResponse(data: any, originalRows: RawRow[]): AIServiceResult {
    const imported: CRMLead[] = [];
    const skipped: SkippedRecord[] = [];

    const results = data.results || [];
    for (let i = 0; i < originalRows.length; i++) {
      const originalRow = originalRows[i];
      const aiResult = results[i];

      if (aiResult && aiResult.success === true && aiResult.lead) {
        // Enforce fallback date if empty
        const lead = aiResult.lead as CRMLead;
        if (!lead.created_at) {
          lead.created_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
        }
        imported.push(lead);
      } else {
        skipped.push({
          row: originalRow,
          reason: aiResult?.skip_reason || 'Skipped by AI mapping logic'
        });
      }
    }

    return { imported, skipped };
  }

  /**
   * Fallback mock processing when no API keys are provided.
   * Emulates mapping by looking at common keywords in keys.
   */
  private mockProcessBatch(rows: RawRow[]): AIServiceResult {
    const imported: CRMLead[] = [];
    const skipped: SkippedRecord[] = [];

    const commonEmailKeys = ['email', 'mail', 'e-mail', 'emailaddress', 'primaryemail'];
    const commonPhoneKeys = ['phone', 'mobile', 'mobile number', 'contact', 'telephone', 'number', 'ph', 'ph. number'];
    const commonNameKeys = ['name', 'full name', 'fullname', 'first name', 'lead name', 'client name'];
    const commonCompanyKeys = ['company', 'organization', 'org', 'firm', 'business'];
    const commonCityKeys = ['city', 'town', 'location'];
    const commonStateKeys = ['state', 'region', 'province'];
    const commonCountryKeys = ['country', 'nation'];
    const commonNoteKeys = ['note', 'notes', 'remark', 'remarks', 'comment', 'comments', 'feedback'];
    const commonSourceKeys = ['source', 'data source', 'data_source', 'medium', 'utm_source'];
    const commonPossessionKeys = ['possession', 'possession_time', 'time', 'timeline'];
    const commonDescriptionKeys = ['description', 'desc', 'details', 'about'];

    for (const row of rows) {
      let email = '';
      let phone = '';
      let name = 'Unknown Lead';
      let company = '';
      let city = '';
      let state = '';
      let country = '';
      let notes = '';
      let source: any = '';
      let possession = '';
      let description = '';

      // Simple heuristic mapping
      for (const [key, value] of Object.entries(row)) {
        const k = key.toLowerCase().trim();
        const v = value.trim();
        if (!v) continue;

        if (commonEmailKeys.some(x => k.includes(x))) {
          if (!email) email = v;
          else notes += ` Secondary Email: ${v};`;
        } else if (commonPhoneKeys.some(x => k.includes(x))) {
          if (!phone) phone = v;
          else notes += ` Secondary Phone: ${v};`;
        } else if (commonCompanyKeys.some(x => k.includes(x))) {
          company = v;
        } else if (commonCityKeys.some(x => k.includes(x))) {
          city = v;
        } else if (commonStateKeys.some(x => k.includes(x))) {
          state = v;
        } else if (commonCountryKeys.some(x => k.includes(x))) {
          country = v;
        } else if (commonNoteKeys.some(x => k.includes(x))) {
          notes += ` ${v};`;
        } else if (commonSourceKeys.some(x => k.includes(x))) {
          const matchedSource = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'].find(
            s => v.toLowerCase().includes(s.replace('_', ' ')) || s.includes(v.toLowerCase())
          );
          if (matchedSource) source = matchedSource;
        } else if (commonPossessionKeys.some(x => k.includes(x))) {
          possession = v;
        } else if (commonDescriptionKeys.some(x => k.includes(x))) {
          description = v;
        } else if (commonNameKeys.some(x => k.includes(x))) {
          if (name === 'Unknown Lead') name = v;
          else name += ' ' + v;
        } else {
          notes += ` [${key}]: ${v};`;
        }
      }

      // Check skip condition
      if (!email && !phone) {
        skipped.push({
          row,
          reason: 'Skipped: Record contains neither email nor mobile/phone'
        });
        continue;
      }

      // Format phone into country code and mobile
      let countryCode = '+91'; // default
      let mobile = phone;
      if (phone.startsWith('+')) {
        const spaceIdx = phone.indexOf(' ');
        if (spaceIdx > 0) {
          countryCode = phone.substring(0, spaceIdx);
          mobile = phone.substring(spaceIdx + 1);
        } else if (phone.length > 10) {
          countryCode = phone.substring(0, phone.length - 10);
          mobile = phone.substring(phone.length - 10);
        }
      } else if (phone.length === 10) {
        countryCode = '+91';
        mobile = phone;
      }

      const lead: CRMLead = {
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        name,
        email,
        country_code: countryCode,
        mobile_without_country_code: mobile.replace(/\D/g, ''),
        company,
        city,
        state,
        country,
        lead_owner: 'test@gmail.com',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
        crm_note: notes.trim(),
        data_source: source,
        possession_time: possession,
        description
      };

      imported.push(lead);
    }

    return { imported, skipped };
  }
}
