/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service to handle integration with Google Sheets.
 * Allows pulling dynamic data (News, Activities, Documents) or pushing feedback/registrations
 * from the app to a Google Sheet using Google Apps Script or public CSV URLs.
 */

/**
 * Helper to fetch public Google Sheets data formatted as CSV
 * @param sheetId The ID of the Google Spreadsheet
 * @param gid The grid ID (tab ID), default is 0 for the first sheet
 */
export async function fetchSheetCSV(sheetId: string, gid: string = '0'): Promise<string[][]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error fetching Google Sheet CSV:', error);
    throw error;
  }
}

/**
 * Helper to submit data (like registrations or feedback) to a Google Sheet via a custom Web App (Google Apps Script)
 * @param webAppUrl The URL of the published Google Apps Script Web App
 * @param payload The data payload to submit
 */
export async function submitToGoogleSheet(webAppUrl: string, payload: Record<string, any>): Promise<any> {
  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting to Google Sheet:', error);
    throw error;
  }
}

/**
 * Simple CSV parser to handle basic comma-separated structures
 */
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  return lines
    .map(line => {
      // Very basic split by comma, handling potential simple quotes
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    })
    .filter(row => row.length > 0 && row.some(cell => cell !== ''));
}
