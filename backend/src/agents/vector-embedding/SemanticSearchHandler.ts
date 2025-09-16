import { VectorStore, SearchResult } from './VectorStore';
import { EmbeddingModelManager } from './EmbeddingModelManager';

export interface SearchQuery {
  query: string;
  topK?: number;
  threshold?: number;
  filters?: Record<string, unknown>;
  includeMetadata?: boolean;
  rerank?: boolean;
}

export interface ProcessedQuery {
  originalQuery: string;
  expandedQuery?: string;
  intent: QueryIntent;
  entities: string[];
  keywords: string[];
  semanticType: 'factual' | 'conceptual' | 'procedural' | 'comparative';
}

export interface SearchResponse {
  query: ProcessedQuery;
  results: EnhancedSearchResult[];
  stats: SearchStats;
  suggestions?: string[];
}

export interface EnhancedSearchResult extends SearchResult {
  relevanceReason?: string;
  contextSnippet?: string;
  relatedChunks?: string[];
  confidence: number;
}

export interface SearchStats {
  totalResults: number;
  searchTime: number;
  processingTime: number;
  modelUsed: string;
  queryComplexity: 'simple' | 'medium' | 'complex';
}

enum QueryIntent {
  SEARCH = 'search',
  QUESTION = 'question',
  COMPARISON = 'comparison',
  DEFINITION = 'definition',
  HOW_TO = 'how_to',
  EXPLANATION = 'explanation'
}

export class SemanticSearchHandler {
  private vectorStore: VectorStore;
  private modelManager: EmbeddingModelManager;
  private queryHistory: Array<{ query: string; timestamp: number; results: number }> = [];
  private isInitialized: boolean = false;

  // Query pattern matchers
  private readonly queryPatterns = {
    question: /^(what|when|where|who|why|how|can|could|would|should|is|are|will|does|do)\s+/i,
    comparison: /\b(vs|versus|compare|difference|better|best|worse|worst|between)\b/i,
    definition: /\b(what is|define|definition|meaning|explain)\b/i,
    howTo: /\b(how to|how do|how can|tutorial|guide|steps)\b/i,
    explanation: /\b(explain|why|because|reason|cause|effect)\b/i
  };

  // Stop words for query processing
  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'among', 'around', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
  ]);

  constructor(vectorStore: VectorStore, modelManager: EmbeddingModelManager) {
    this.vectorStore = vectorStore;
    this.modelManager = modelManager;
  }

  async initialize(): Promise<void> {
    console.log('🔍 Initializing Semantic Search Handler...');
    
    if (!this.vectorStore.isReady) {
      await this.vectorStore.initialize();
    }
    
    if (!this.modelManager.initialized) {
      await this.modelManager.initialize();
    }
    
    this.isInitialized = true;
    console.log('✅ Semantic Search Handler initialized');
  }

  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    if (!this.isInitialized) {
      throw new Error('Semantic Search Handler not initialized');
    }

    const startTime = Date.now();
    console.log(`🔍 Processing search query: "${searchQuery.query}"`);

    // Process and analyze the query
    const processedQuery = await this.processQuery(searchQuery.query);
    
    // Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(processedQuery);
    
    // Perform vector search
    const searchStartTime = Date.now();
    const results = await this.vectorStore.search(
      queryEmbedding,
      searchQuery.topK || 10,
      searchQuery.threshold,
      searchQuery.filters
    );
    const searchTime = Date.now() - searchStartTime;

    // Enhance and re-rank results
    const enhancedResults = await this.enhanceResults(results, processedQuery, searchQuery);
    
    // Generate suggestions
    const suggestions = await this.generateSuggestions(processedQuery, enhancedResults);
    
    const totalTime = Date.now() - startTime;
    
    // Update query history
    this.updateQueryHistory(searchQuery.query, enhancedResults.length);
    
    const response: SearchResponse = {
      query: processedQuery,
      results: enhancedResults,
      stats: {
        totalResults: enhancedResults.length,
        searchTime,
        processingTime: totalTime,
        modelUsed: this.modelManager.getCurrentModel() || 'unknown',
        queryComplexity: this.assessQueryComplexity(processedQuery)
      },
      suggestions
    };

    console.log(`✅ Search completed: ${enhancedResults.length} results in ${totalTime}ms`);
    return response;
  }

  async findSimilarContent(
    fileId?: string,
    chunkId?: string,
    topK: number = 5,
    includeSource: boolean = false
  ): Promise<EnhancedSearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Semantic Search Handler not initialized');
    }

    console.log(`🔍 Finding similar content for ${fileId ? 'file: ' + fileId : 'chunk: ' + chunkId}`);
    
    const results = await this.vectorStore.findSimilar(fileId, chunkId, topK);
    
    // Filter out source if requested
    const filteredResults = includeSource ? 
      results : 
      results.filter(r => r.fileId !== fileId && r.chunkId !== chunkId);
    
    // Enhance results with additional context
    return this.enhanceBasicResults(filteredResults);
  }

  private async processQuery(query: string): Promise<ProcessedQuery> {
    const cleanQuery = query.trim();
    const intent = this.detectQueryIntent(cleanQuery);
    const entities = this.extractEntities(cleanQuery);
    const keywords = this.extractKeywords(cleanQuery);
    const semanticType = this.classifySemanticType(cleanQuery, intent);
    const expandedQuery = await this.expandQuery(cleanQuery, intent);

    return {
      originalQuery: cleanQuery,
      expandedQuery,
      intent,
      entities,
      keywords,
      semanticType
    };
  }

  private detectQueryIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    if (this.queryPatterns.definition.test(lowerQuery)) {
      return QueryIntent.DEFINITION;
    }
    
    if (this.queryPatterns.comparison.test(lowerQuery)) {
      return QueryIntent.COMPARISON;
    }
    
    if (this.queryPatterns.howTo.test(lowerQuery)) {
      return QueryIntent.HOW_TO;
    }
    
    if (this.queryPatterns.explanation.test(lowerQuery)) {
      return QueryIntent.EXPLANATION;
    }
    
    if (this.queryPatterns.question.test(lowerQuery)) {
      return QueryIntent.QUESTION;
    }

    return QueryIntent.SEARCH;
  }

  private extractEntities(query: string): string[] {
    // Simple entity extraction - can be enhanced with NLP libraries
    const entities: string[] = [];
    
    // Extract quoted phrases
    const quotedMatches = query.match(/"([^"]+)"/g);
    if (quotedMatches) {
      entities.push(...quotedMatches.map(match => match.slice(1, -1)));
    }
    
    // Extract capitalized words (potential proper nouns)
    const capitalizedMatches = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedMatches) {
      entities.push(...capitalizedMatches);
    }
    
    // Extract technical terms (words with numbers, dashes, or dots)
    const technicalMatches = query.match(/\b\w*[0-9_\-\.]\w*\b/g);
    if (technicalMatches) {
      entities.push(...technicalMatches);
    }

    return Array.from(new Set(entities)); // Remove duplicates
  }

  private extractKeywords(query: string): string[] {
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));
    
    // Remove duplicates and sort by frequency if needed
    return Array.from(new Set(words));
  }

  private classifySemanticType(query: string, intent: QueryIntent): 'factual' | 'conceptual' | 'procedural' | 'comparative' {
    if (intent === QueryIntent.HOW_TO) {
      return 'procedural';
    }
    
    if (intent === QueryIntent.COMPARISON) {
      return 'comparative';
    }
    
    if (intent === QueryIntent.DEFINITION || intent === QueryIntent.EXPLANATION) {
      return 'conceptual';
    }
    
    return 'factual';
  }

  private async expandQuery(query: string, intent: QueryIntent): Promise<string> {
    // Simple query expansion - can be enhanced with synonyms, related terms, etc.
    let expandedQuery = query;
    
    switch (intent) {
      case QueryIntent.DEFINITION:
        expandedQuery += ' meaning concept explanation';
        break;
      case QueryIntent.HOW_TO:
        expandedQuery += ' tutorial guide steps process method';
        break;
      case QueryIntent.COMPARISON:
        expandedQuery += ' differences similarities compare contrast';
        break;
      case QueryIntent.EXPLANATION:
        expandedQuery += ' reason why because cause effect';
        break;
    }
    
    return expandedQuery;
  }

  private async generateQueryEmbedding(processedQuery: ProcessedQuery): Promise<number[]> {
    // Use expanded query if available, otherwise use original
    const queryText = processedQuery.expandedQuery || processedQuery.originalQuery;
    
    const embeddings = await this.modelManager.generateEmbedding(queryText);
    return embeddings;
  }

  private async enhanceResults(
    results: SearchResult[],
    processedQuery: ProcessedQuery,
    searchQuery: SearchQuery
  ): Promise<EnhancedSearchResult[]> {
    const enhancedResults: EnhancedSearchResult[] = [];

    for (const result of results) {
      const enhanced: EnhancedSearchResult = {
        ...result,
        relevanceReason: this.generateRelevanceReason(result, processedQuery),
        contextSnippet: this.generateContextSnippet(result, processedQuery),
        confidence: this.calculateConfidence(result, processedQuery),
        relatedChunks: await this.findRelatedChunks(result)
      };

      enhancedResults.push(enhanced);
    }

    // Re-rank results if requested
    if (searchQuery.rerank) {
      return this.rerankResults(enhancedResults, processedQuery);
    }

    return enhancedResults;
  }

  private async enhanceBasicResults(results: SearchResult[]): Promise<EnhancedSearchResult[]> {
    return results.map(result => ({
      ...result,
      confidence: result.score,
      contextSnippet: this.truncateContent(result.content, 200)
    }));
  }

  private generateRelevanceReason(result: SearchResult, processedQuery: ProcessedQuery): string {
    const reasons = [];
    
    // Check for exact keyword matches
    const keywordMatches = processedQuery.keywords.filter(keyword =>
      result.content.toLowerCase().includes(keyword)
    ).length;
    
    if (keywordMatches > 0) {
      reasons.push(`${keywordMatches} keyword match${keywordMatches > 1 ? 'es' : ''}`);
    }
    
    // Check for entity matches
    const entityMatches = processedQuery.entities.filter(entity =>
      result.content.toLowerCase().includes(entity.toLowerCase())
    ).length;
    
    if (entityMatches > 0) {
      reasons.push(`${entityMatches} entity match${entityMatches > 1 ? 'es' : ''}`);
    }
    
    // Add semantic similarity note
    reasons.push(`${Math.round(result.score * 100)}% semantic similarity`);
    
    return reasons.join(', ');
  }

  private generateContextSnippet(result: SearchResult, processedQuery: ProcessedQuery): string {
    const content = result.content;
    const maxLength = 300;
    
    // Find the best snippet that contains query terms
    const keywords = [...processedQuery.keywords, ...processedQuery.entities].map(k => k.toLowerCase());
    
    let bestSnippet = content.slice(0, maxLength);
    let bestScore = 0;
    
    // Try different starting positions to find the most relevant snippet
    const words = content.split(' ');
    for (let i = 0; i < words.length - 20; i += 10) {
      const snippet = words.slice(i, i + 50).join(' ');
      if (snippet.length > maxLength) continue;
      
      const score = keywords.filter(keyword => 
        snippet.toLowerCase().includes(keyword)
      ).length;
      
      if (score > bestScore) {
        bestScore = score;
        bestSnippet = snippet;
      }
    }
    
    return bestSnippet.length > maxLength 
      ? bestSnippet.slice(0, maxLength) + '...'
      : bestSnippet;
  }

  private calculateConfidence(result: SearchResult, processedQuery: ProcessedQuery): number {
    let confidence = result.score;
    
    // Boost confidence for exact matches
    const exactMatches = processedQuery.entities.filter(entity =>
      result.content.toLowerCase().includes(entity.toLowerCase())
    ).length;
    
    if (exactMatches > 0) {
      confidence = Math.min(confidence + (exactMatches * 0.1), 1.0);
    }
    
    // Consider content length (avoid very short snippets unless highly relevant)
    if (result.content.length < 100 && result.score < 0.9) {
      confidence *= 0.8;
    }
    
    return confidence;
  }

  private async findRelatedChunks(result: SearchResult): Promise<string[]> {
    // Find other chunks from the same file that might be related
    try {
      const relatedResults = await this.vectorStore.findSimilar(result.fileId, undefined, 3);
      return relatedResults
        .filter(r => r.chunkId !== result.chunkId)
        .slice(0, 2) // Limit to 2 related chunks
        .map(r => r.chunkId);
    } catch (error) {
      console.warn('Failed to find related chunks:', error);
      return [];
    }
  }

  private rerankResults(results: EnhancedSearchResult[], processedQuery: ProcessedQuery): EnhancedSearchResult[] {
    return results.sort((a, b) => {
      // Multi-factor ranking: confidence, relevance, content quality
      const scoreA = (a.confidence * 0.6) + (a.score * 0.3) + (this.assessContentQuality(a) * 0.1);
      const scoreB = (b.confidence * 0.6) + (b.score * 0.3) + (this.assessContentQuality(b) * 0.1);
      
      return scoreB - scoreA;
    });
  }

  private assessContentQuality(result: EnhancedSearchResult): number {
    // Simple content quality assessment
    let quality = 0.5; // Base quality
    
    // Longer content generally has more context
    if (result.content.length > 200) quality += 0.2;
    if (result.content.length > 500) quality += 0.1;
    
    // Well-structured content (has punctuation, proper sentences)
    const sentenceCount = result.content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    if (sentenceCount > 1) quality += 0.1;
    if (sentenceCount > 3) quality += 0.1;
    
    return Math.min(quality, 1.0);
  }

  private async generateSuggestions(processedQuery: ProcessedQuery, results: EnhancedSearchResult[]): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Suggest related queries based on the original query
    if (processedQuery.intent === QueryIntent.SEARCH && processedQuery.keywords.length > 0) {
      const mainKeyword = processedQuery.keywords[0];
      suggestions.push(
        `What is ${mainKeyword}?`,
        `How to use ${mainKeyword}`,
        `${mainKeyword} examples`
      );
    }
    
    // Suggest refinements if few results
    if (results.length < 3 && processedQuery.keywords.length > 1) {
      suggestions.push(
        processedQuery.keywords.slice(0, 2).join(' '),
        processedQuery.keywords[0] + ' guide'
      );
    }
    
    // Suggest broader queries if no results
    if (results.length === 0 && processedQuery.keywords.length > 0) {
      suggestions.push(processedQuery.keywords[0]);
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private assessQueryComplexity(processedQuery: ProcessedQuery): 'simple' | 'medium' | 'complex' {
    const factors = {
      keywords: processedQuery.keywords.length,
      entities: processedQuery.entities.length,
      queryLength: processedQuery.originalQuery.length,
      hasComparison: processedQuery.intent === QueryIntent.COMPARISON,
      hasExplanation: processedQuery.intent === QueryIntent.EXPLANATION
    };
    
    let complexityScore = factors.keywords + (factors.entities * 2);
    
    if (factors.queryLength > 50) complexityScore += 2;
    if (factors.hasComparison || factors.hasExplanation) complexityScore += 3;
    
    if (complexityScore <= 3) return 'simple';
    if (complexityScore <= 7) return 'medium';
    return 'complex';
  }

  private updateQueryHistory(query: string, resultsCount: number): void {
    this.queryHistory.push({
      query,
      timestamp: Date.now(),
      results: resultsCount
    });
    
    // Keep only last 100 queries
    if (this.queryHistory.length > 100) {
      this.queryHistory = this.queryHistory.slice(-100);
    }
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    
    // Try to break at word boundary
    const truncated = content.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return (lastSpace > maxLength * 0.8 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  // Public getters for status information
  get isReady(): boolean {
    return this.isInitialized && this.vectorStore.isReady;
  }

  get queryHistoryStats(): { totalQueries: number; averageResults: number; lastQuery?: string } {
    if (this.queryHistory.length === 0) {
      return { totalQueries: 0, averageResults: 0 };
    }
    
    const totalResults = this.queryHistory.reduce((sum, q) => sum + q.results, 0);
    
    return {
      totalQueries: this.queryHistory.length,
      averageResults: Math.round(totalResults / this.queryHistory.length * 10) / 10,
      lastQuery: this.queryHistory[this.queryHistory.length - 1]?.query
    };
  }
}