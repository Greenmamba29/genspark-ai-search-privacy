import * as path from 'path';
import * as fs from 'fs/promises';
// PDF parser will be imported dynamically when needed
import * as mammoth from 'mammoth';
// csv-parser is used differently, removed unused import
import { parseString as parseXml } from 'xml2js';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import {
  PlainTextExtractor,
  MarkdownExtractor,
  JsonExtractor,
  CsvExtractor,
  CodeExtractor,
  PdfExtractor,
  DocxExtractor,
  XlsxExtractor,
  XmlExtractor,
  HtmlExtractor,
  TechnicalModelStrategy,
  NarrativeModelStrategy,
  DataModelStrategy,
  MixedModelStrategy,
  type ModelSelectionStrategy
} from './BasicExtractors.js';

export interface ExtractionResult {
  content: string;
  metadata: Record<string, unknown>;
  confidence: number;
  extractionMethod: string;
  modelSelected?: string;
  processingTime: number;
  wordCount?: number;
  pageCount?: number;
  language?: string;
  documentStructure?: DocumentStructure;
}

export interface DocumentStructure {
  hasHeadings: boolean;
  hasTables: boolean;
  hasImages: boolean;
  hasFormulas: boolean;
  isStructured: boolean;
  contentType: 'technical' | 'narrative' | 'data' | 'mixed';
  complexity: 'simple' | 'medium' | 'complex';
}

export interface ExtractionOptions {
  preserveFormatting?: boolean;
  extractImages?: boolean;
  extractTables?: boolean;
  extractFormulas?: boolean;
  language?: string;
  persona?: string; // For model selection
  instructions?: string; // For processing hints
  maxPages?: number;
  qualityThreshold?: number;
}

export interface ContentExtractor {
  name: string;
  supportedExtensions: string[];
  supportedMimeTypes: string[];
  extract(filePath: string, options?: ExtractionOptions): Promise<ExtractionResult>;
  canHandle(filePath: string, mimeType?: string): boolean;
  getOptimalModel(content: string, options?: ExtractionOptions): string;
}

export class ContentExtractorFactory {
  private extractors: Map<string, ContentExtractor> = new Map();
  private modelSelectionStrategies: Map<string, ModelSelectionStrategy> = new Map();

  constructor() {
    this.registerExtractors();
    this.registerModelSelectionStrategies();
  }

  private registerExtractors(): void {
    // Register all available extractors
    this.registerExtractor(new PlainTextExtractor());
    this.registerExtractor(new MarkdownExtractor());
    this.registerExtractor(new PdfExtractor());
    this.registerExtractor(new DocxExtractor());
    this.registerExtractor(new CsvExtractor());
    this.registerExtractor(new XlsxExtractor());
    this.registerExtractor(new JsonExtractor());
    this.registerExtractor(new XmlExtractor());
    this.registerExtractor(new HtmlExtractor());
    this.registerExtractor(new CodeExtractor());
  }

  private registerModelSelectionStrategies(): void {
    this.modelSelectionStrategies.set('technical', new TechnicalModelStrategy());
    this.modelSelectionStrategies.set('narrative', new NarrativeModelStrategy());
    this.modelSelectionStrategies.set('data', new DataModelStrategy());
    this.modelSelectionStrategies.set('mixed', new MixedModelStrategy());
  }

  private registerExtractor(extractor: ContentExtractor): void {
    this.extractors.set(extractor.name, extractor);
  }

  public getExtractor(filePath: string, mimeType?: string): ContentExtractor | null {
    const ext = path.extname(filePath).toLowerCase();
    
    for (const extractor of this.extractors.values()) {
      if (extractor.canHandle(filePath, mimeType)) {
        return extractor;
      }
    }
    
    return null;
  }

  public async extractContent(
    filePath: string, 
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    try {
      const extractor = this.getExtractor(filePath);
      
      if (!extractor) {
        throw new Error(`No extractor available for file: ${filePath}`);
      }

      const result = await extractor.extract(filePath, options);
      
      // Analyze document structure for better model selection
      const structure = this.analyzeDocumentStructure(result.content);
      result.documentStructure = structure;
      
      // Select optimal model based on content and options
      const selectedModel = this.selectOptimalModel(result.content, structure, options);
      result.modelSelected = selectedModel;
      
      result.processingTime = Date.now() - startTime;
      
      return result;
      
    } catch (error) {
      throw new Error(`Content extraction failed: ${(error as Error).message}`);
    }
  }

  private analyzeDocumentStructure(content: string): DocumentStructure {
    const hasHeadings = /^#{1,6}\s+|\n=+\n|\n-+\n/m.test(content);
    const hasTables = /\|.*\|.*\|/m.test(content) || /\t.*\t/m.test(content);
    const hasImages = /!\[.*\]\(.*\)|<img|image/i.test(content);
    const hasFormulas = /\$.*\$|\\\(.*\\\)|\\\[.*\\\]/m.test(content);
    
    const wordCount = content.split(/\s+/).length;
    const lineCount = content.split('\n').length;
    
    // Determine content type
    let contentType: DocumentStructure['contentType'] = 'narrative';
    if (hasFormulas || /algorithm|equation|theorem|proof/i.test(content)) {
      contentType = 'technical';
    } else if (hasTables || /data|statistics|results|analysis/i.test(content)) {
      contentType = 'data';
    } else if (hasHeadings && hasTables && hasFormulas) {
      contentType = 'mixed';
    }
    
    // Determine complexity
    let complexity: DocumentStructure['complexity'] = 'simple';
    if (wordCount > 1000 || hasFormulas || hasTables) {
      complexity = 'medium';
    }
    if (wordCount > 5000 || (hasFormulas && hasTables && hasHeadings)) {
      complexity = 'complex';
    }
    
    return {
      hasHeadings,
      hasTables,
      hasImages,
      hasFormulas,
      isStructured: hasHeadings || hasTables,
      contentType,
      complexity
    };
  }

  private selectOptimalModel(
    content: string, 
    structure: DocumentStructure, 
    options: ExtractionOptions
  ): string {
    const strategy = this.modelSelectionStrategies.get(structure.contentType);
    
    if (strategy) {
      return strategy.selectModel(content, structure, options);
    }
    
    // Default model selection
    return this.getDefaultModel(structure, options);
  }

  private getDefaultModel(structure: DocumentStructure, options: ExtractionOptions): string {
    // Default model selection based on complexity and persona
    if (options.persona?.includes('technical') || structure.contentType === 'technical') {
      return structure.complexity === 'complex' ? 'sentence-transformers/all-mpnet-base-v2' : 'sentence-transformers/all-MiniLM-L6-v2';
    }
    
    if (structure.contentType === 'data') {
      return 'sentence-transformers/all-distilroberta-v1';
    }
    
    // General purpose model
    return 'sentence-transformers/all-MiniLM-L6-v2';
  }
}

export default ContentExtractorFactory;