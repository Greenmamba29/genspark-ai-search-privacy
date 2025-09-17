import * as fs from 'fs/promises';
import * as path from 'path';
import { parseString as parseXml } from 'xml2js';
import * as XLSX from 'xlsx';
import type { ContentExtractor, ExtractionResult, ExtractionOptions, DocumentStructure } from './ContentExtractorFactory.js';

// Model selection strategies
export interface ModelSelectionStrategy {
  selectModel(content: string, structure: DocumentStructure, options?: ExtractionOptions): string;
}

export class TechnicalModelStrategy implements ModelSelectionStrategy {
  selectModel(content: string, structure: DocumentStructure, options?: ExtractionOptions): string {
    if (structure.complexity === 'complex') {
      return 'sentence-transformers/all-mpnet-base-v2';
    }
    return 'sentence-transformers/all-MiniLM-L6-v2';
  }
}

export class NarrativeModelStrategy implements ModelSelectionStrategy {
  selectModel(content: string, structure: DocumentStructure, options?: ExtractionOptions): string {
    return 'sentence-transformers/paraphrase-distilroberta-base-v1';
  }
}

export class DataModelStrategy implements ModelSelectionStrategy {
  selectModel(content: string, structure: DocumentStructure, options?: ExtractionOptions): string {
    return 'sentence-transformers/all-distilroberta-v1';
  }
}

export class MixedModelStrategy implements ModelSelectionStrategy {
  selectModel(content: string, structure: DocumentStructure, options?: ExtractionOptions): string {
    if (structure.complexity === 'complex') {
      return 'sentence-transformers/all-mpnet-base-v2';
    }
    return 'sentence-transformers/all-MiniLM-L6-v2';
  }
}

// Base extractor class
abstract class BaseExtractor implements ContentExtractor {
  abstract name: string;
  abstract supportedExtensions: string[];
  abstract supportedMimeTypes: string[];

  canHandle(filePath: string, mimeType?: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  getOptimalModel(content: string, options?: ExtractionOptions): string {
    return 'sentence-transformers/all-MiniLM-L6-v2'; // Default model
  }

  abstract extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult>;
}

// Plain text extractor
export class PlainTextExtractor extends BaseExtractor {
  name = 'PlainTextExtractor';
  supportedExtensions = ['.txt'];
  supportedMimeTypes = ['text/plain'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const startTime = Date.now();
      const content = await fs.readFile(filePath, 'utf-8');
      const processingTime = Date.now() - startTime;

      return {
        content: content.trim(),
        metadata: {
          encoding: 'utf-8',
          fileSize: content.length
        },
        confidence: 1.0,
        extractionMethod: 'text',
        processingTime,
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      throw new Error(`Failed to extract text from ${filePath}: ${(error as Error).message}`);
    }
  }
}

// Markdown extractor
export class MarkdownExtractor extends BaseExtractor {
  name = 'MarkdownExtractor';
  supportedExtensions = ['.md', '.markdown'];
  supportedMimeTypes = ['text/markdown'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const startTime = Date.now();
      const content = await fs.readFile(filePath, 'utf-8');
      const processingTime = Date.now() - startTime;

      return {
        content: content.trim(),
        metadata: {
          format: 'markdown',
          hasCodeBlocks: /```/.test(content),
          hasHeaders: /^#{1,6}\s/m.test(content),
          hasLinks: /\[.*\]\(.*\)/.test(content)
        },
        confidence: 1.0,
        extractionMethod: 'markdown',
        processingTime,
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      throw new Error(`Failed to extract markdown from ${filePath}: ${(error as Error).message}`);
    }
  }
}

// JSON extractor
export class JsonExtractor extends BaseExtractor {
  name = 'JsonExtractor';
  supportedExtensions = ['.json'];
  supportedMimeTypes = ['application/json'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const startTime = Date.now();
      const rawContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(rawContent);
      
      // Convert JSON to readable text format
      const content = this.jsonToText(jsonData);
      const processingTime = Date.now() - startTime;

      return {
        content,
        metadata: {
          format: 'json',
          keys: Object.keys(jsonData).length,
          structure: Array.isArray(jsonData) ? 'array' : 'object',
          rawSize: rawContent.length
        },
        confidence: 1.0,
        extractionMethod: 'json',
        processingTime,
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      throw new Error(`Failed to extract JSON from ${filePath}: ${(error as Error).message}`);
    }
  }

  private jsonToText(obj: any, prefix = ''): string {
    let text = '';
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          text += `${prefix}[${index}]: ${this.jsonToText(item, prefix + '  ')}\n`;
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          text += `${prefix}${key}: ${this.jsonToText(value, prefix + '  ')}\n`;
        });
      }
    } else {
      text = String(obj);
    }
    
    return text;
  }
}

// CSV extractor
export class CsvExtractor extends BaseExtractor {
  name = 'CsvExtractor';
  supportedExtensions = ['.csv'];
  supportedMimeTypes = ['text/csv'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const startTime = Date.now();
      const content = await fs.readFile(filePath, 'utf-8');
      
      const lines = content.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',').map(h => h.trim()) || [];
      const dataRows = lines.slice(1);
      
      // Convert CSV to readable text
      let textContent = `CSV Data with ${headers.length} columns and ${dataRows.length} rows:\n\n`;
      textContent += `Columns: ${headers.join(', ')}\n\n`;
      
      // Sample first few rows for content
      const sampleRows = dataRows.slice(0, 10);
      sampleRows.forEach((row, index) => {
        const values = row.split(',').map(v => v.trim());
        textContent += `Row ${index + 1}: `;
        headers.forEach((header, i) => {
          textContent += `${header}=${values[i] || 'N/A'}; `;
        });
        textContent += '\n';
      });
      
      const processingTime = Date.now() - startTime;

      return {
        content: textContent.trim(),
        metadata: {
          format: 'csv',
          columns: headers.length,
          rows: dataRows.length,
          headers: headers
        },
        confidence: 1.0,
        extractionMethod: 'csv',
        processingTime,
        wordCount: textContent.split(/\s+/).length
      };
    } catch (error) {
      throw new Error(`Failed to extract CSV from ${filePath}: ${(error as Error).message}`);
    }
  }
}

// Code extractor
export class CodeExtractor extends BaseExtractor {
  name = 'CodeExtractor';
  supportedExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
  supportedMimeTypes = ['text/javascript', 'application/typescript', 'text/x-python'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const startTime = Date.now();
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();
      
      // Extract comments and function names for better searchability
      const comments = this.extractComments(content, ext);
      const functions = this.extractFunctions(content, ext);
      
      let searchableContent = content;
      if (comments.length > 0) {
        searchableContent += '\n\n// Extracted Comments:\n' + comments.join('\n');
      }
      if (functions.length > 0) {
        searchableContent += '\n\n// Functions: ' + functions.join(', ');
      }
      
      const processingTime = Date.now() - startTime;

      return {
        content: searchableContent.trim(),
        metadata: {
          format: 'code',
          language: this.getLanguage(ext),
          functions: functions.length,
          comments: comments.length,
          lines: content.split('\n').length
        },
        confidence: 1.0,
        extractionMethod: 'code',
        processingTime,
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      throw new Error(`Failed to extract code from ${filePath}: ${(error as Error).message}`);
    }
  }

  private extractComments(content: string, ext: string): string[] {
    const comments: string[] = [];
    
    // Single line comments
    const singleLineRegex = /\/\/(.*)$/gm;
    let match;
    while ((match = singleLineRegex.exec(content)) !== null) {
      const comment = match[1]?.trim();
      if (comment && comment.length > 5) comments.push(comment);
    }
    
    // Multi-line comments
    const multiLineRegex = /\/\*([\s\S]*?)\*\//g;
    while ((match = multiLineRegex.exec(content)) !== null) {
      const comment = match[1]?.trim();
      if (comment && comment.length > 5) comments.push(comment);
    }
    
    return comments;
  }

  private extractFunctions(content: string, ext: string): string[] {
    const functions: string[] = [];
    
    // JavaScript/TypeScript functions
    if (['.js', '.ts'].includes(ext)) {
      const funcRegex = /(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:function|\([^)]*\)\s*=>))/g;
      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        const funcName = match[1] || match[2];
        if (funcName) functions.push(funcName);
      }
    }
    
    // Python functions
    if (ext === '.py') {
      const pythonFuncRegex = /def\s+(\w+)/g;
      let match;
      while ((match = pythonFuncRegex.exec(content)) !== null) {
        const funcName = match[1];
        if (funcName) functions.push(funcName);
      }
    }
    
    return functions;
  }

  private getLanguage(ext: string): string {
    const langMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin'
    };
    
    return langMap[ext] || 'unknown';
  }
}

// Placeholder extractors for more complex formats
export class PdfExtractor extends BaseExtractor {
  name = 'PdfExtractor';
  supportedExtensions = ['.pdf'];
  supportedMimeTypes = ['application/pdf'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    // For now, return placeholder - PDF extraction requires pdf-parse
    const startTime = Date.now();
    const stats = await fs.stat(filePath);
    
    return {
      content: `PDF Document: ${path.basename(filePath)}\n[PDF content extraction not yet implemented - requires pdf-parse library]`,
      metadata: {
        format: 'pdf',
        fileSize: stats.size,
        placeholder: true
      },
      confidence: 0.5,
      extractionMethod: 'placeholder',
      processingTime: Date.now() - startTime
    };
  }
}

export class DocxExtractor extends BaseExtractor {
  name = 'DocxExtractor';
  supportedExtensions = ['.docx', '.doc'];
  supportedMimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    // For now, return placeholder - DOCX extraction requires mammoth
    const startTime = Date.now();
    const stats = await fs.stat(filePath);
    
    return {
      content: `Word Document: ${path.basename(filePath)}\n[DOCX content extraction not yet implemented - requires mammoth library]`,
      metadata: {
        format: 'docx',
        fileSize: stats.size,
        placeholder: true
      },
      confidence: 0.5,
      extractionMethod: 'placeholder',
      processingTime: Date.now() - startTime
    };
  }
}

export class XlsxExtractor extends BaseExtractor {
  name = 'XlsxExtractor';
  supportedExtensions = ['.xlsx', '.xls'];
  supportedMimeTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const startTime = Date.now();
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      let content = `Excel Spreadsheet with ${sheetNames.length} sheet(s):\n\n`;
      
      sheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
          const csvData = XLSX.utils.sheet_to_csv(sheet);
          content += `Sheet: ${sheetName}\n${csvData}\n\n`;
        }
      });
      
      const processingTime = Date.now() - startTime;

      return {
        content: content.trim(),
        metadata: {
          format: 'xlsx',
          sheets: sheetNames.length,
          sheetNames: sheetNames
        },
        confidence: 1.0,
        extractionMethod: 'xlsx',
        processingTime,
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      throw new Error(`Failed to extract XLSX from ${filePath}: ${(error as Error).message}`);
    }
  }
}

export class XmlExtractor extends BaseExtractor {
  name = 'XmlExtractor';
  supportedExtensions = ['.xml'];
  supportedMimeTypes = ['application/xml', 'text/xml'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const startTime = Date.now();
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Convert XML to readable text
      let textContent = content;
      
      const processingTime = Date.now() - startTime;

      return {
        content: textContent.trim(),
        metadata: {
          format: 'xml',
          hasAttributes: content.includes('='),
          tagCount: (content.match(/</g) || []).length
        },
        confidence: 0.8,
        extractionMethod: 'xml',
        processingTime,
        wordCount: content.split(/\s+/).length
      };
    } catch (error) {
      throw new Error(`Failed to extract XML from ${filePath}: ${(error as Error).message}`);
    }
  }
}

export class HtmlExtractor extends BaseExtractor {
  name = 'HtmlExtractor';
  supportedExtensions = ['.html', '.htm'];
  supportedMimeTypes = ['text/html'];

  async extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult> {
    try {
      const startTime = Date.now();
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Simple HTML content extraction (remove tags)
      const textContent = content
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const processingTime = Date.now() - startTime;

      return {
        content: textContent,
        metadata: {
          format: 'html',
          hasScripts: /<script/i.test(content),
          hasStyles: /<style/i.test(content),
          tagCount: (content.match(/</g) || []).length
        },
        confidence: 0.9,
        extractionMethod: 'html',
        processingTime,
        wordCount: textContent.split(/\s+/).length
      };
    } catch (error) {
      throw new Error(`Failed to extract HTML from ${filePath}: ${(error as Error).message}`);
    }
  }
}