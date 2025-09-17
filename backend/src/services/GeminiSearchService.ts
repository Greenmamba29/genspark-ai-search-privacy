import { GoogleGenerativeAI } from '@google/generative-ai';

export interface QueryEnhancement {
  originalQuery: string;
  enhancedQuery: string;
  intent: 'search' | 'filter' | 'summarize' | 'compare' | 'analyze';
  suggestedFilters: {
    type?: string[];
    dateRange?: { start: string; end: string };
    keywords?: string[];
  };
  confidence: number;
  explanation: string;
}

export interface SearchSuggestion {
  suggestion: string;
  category: 'related' | 'refined' | 'broader' | 'specific';
  confidence: number;
}

export interface ContentSummary {
  summary: string;
  keyPoints: string[];
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export class GeminiSearchService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private isInitialized = false;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.genAI) {
      console.warn('⚠️ Gemini API key not provided, using fallback mode');
      this.isInitialized = false;
      return false;
    }

    try {
      // Test the connection with a simple prompt
      const result = await this.model.generateContent('Test connection');
      const response = await result.response;
      console.log('✅ Gemini 2.5 Pro initialized successfully');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini 2.5 Pro:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async enhanceQuery(query: string, context?: { fileTypes?: string[]; recentSearches?: string[] }): Promise<QueryEnhancement> {
    if (!this.isInitialized) {
      return this.getFallbackEnhancement(query);
    }

    try {
      const prompt = this.buildQueryEnhancementPrompt(query, context);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseQueryEnhancement(text, query);
    } catch (error) {
      console.error('Error enhancing query with Gemini:', error);
      return this.getFallbackEnhancement(query);
    }
  }

  async generateSearchSuggestions(query: string, searchResults?: any[]): Promise<SearchSuggestion[]> {
    if (!this.isInitialized) {
      return this.getFallbackSuggestions(query);
    }

    try {
      const prompt = this.buildSuggestionsPrompt(query, searchResults);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseSuggestions(text);
    } catch (error) {
      console.error('Error generating suggestions with Gemini:', error);
      return this.getFallbackSuggestions(query);
    }
  }

  async summarizeContent(content: string, title: string): Promise<ContentSummary> {
    if (!this.isInitialized) {
      return this.getFallbackSummary(content, title);
    }

    try {
      const prompt = this.buildSummaryPrompt(content, title);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseSummary(text);
    } catch (error) {
      console.error('Error summarizing content with Gemini:', error);
      return this.getFallbackSummary(content, title);
    }
  }

  async analyzeSearchIntent(query: string, userHistory?: string[]): Promise<{
    intent: string;
    entities: string[];
    confidence: number;
    recommendations: string[];
  }> {
    if (!this.isInitialized) {
      return this.getFallbackIntent(query);
    }

    try {
      const prompt = `
        Analyze the search intent of this query: "${query}"
        
        Consider user history: ${userHistory?.join(', ') || 'None'}
        
        Provide analysis in JSON format:
        {
          "intent": "primary intent (search, filter, analyze, compare, etc.)",
          "entities": ["extracted entities/keywords"],
          "confidence": 0.0-1.0,
          "recommendations": ["suggested actions or refinements"]
        }
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(this.extractJsonFromResponse(text));
    } catch (error) {
      console.error('Error analyzing search intent:', error);
      return this.getFallbackIntent(query);
    }
  }

  private buildQueryEnhancementPrompt(query: string, context?: any): string {
    return `
      You are an advanced search query enhancer. Analyze this search query and improve it for semantic search.
      
      Query: "${query}"
      Context: ${JSON.stringify(context || {})}
      
      Provide enhancement in JSON format:
      {
        "enhancedQuery": "improved search terms for better semantic matching",
        "intent": "search|filter|summarize|compare|analyze",
        "suggestedFilters": {
          "type": ["relevant file types"],
          "keywords": ["additional relevant terms"]
        },
        "confidence": 0.0-1.0,
        "explanation": "brief explanation of enhancements made"
      }
      
      Focus on:
      - Expanding abbreviations and acronyms
      - Adding relevant synonyms and related terms
      - Identifying implicit filters or constraints
      - Improving semantic clarity
    `;
  }

  private buildSuggestionsPrompt(query: string, searchResults?: any[]): string {
    const resultsContext = searchResults ? 
      `Based on current results: ${searchResults.map(r => r.title).join(', ')}` : 
      'No current results available';

    return `
      Generate search suggestions for the query: "${query}"
      ${resultsContext}
      
      Provide 5 suggestions in JSON array format:
      [
        {
          "suggestion": "refined search query",
          "category": "related|refined|broader|specific",
          "confidence": 0.0-1.0
        }
      ]
      
      Categories:
      - related: Similar topics or concepts
      - refined: More specific versions of the query
      - broader: Wider scope variations
      - specific: Narrower, more targeted searches
    `;
  }

  private buildSummaryPrompt(content: string, title: string): string {
    return `
      Analyze and summarize this content:
      
      Title: "${title}"
      Content: "${content.substring(0, 2000)}..."
      
      Provide analysis in JSON format:
      {
        "summary": "concise 2-3 sentence summary",
        "keyPoints": ["3-5 main points or takeaways"],
        "tags": ["relevant tags/categories"],
        "sentiment": "positive|negative|neutral",
        "complexity": "beginner|intermediate|advanced"
      }
    `;
  }

  private parseQueryEnhancement(response: string, originalQuery: string): QueryEnhancement {
    try {
      const json = JSON.parse(this.extractJsonFromResponse(response));
      return {
        originalQuery,
        enhancedQuery: json.enhancedQuery || originalQuery,
        intent: json.intent || 'search',
        suggestedFilters: json.suggestedFilters || {},
        confidence: json.confidence || 0.7,
        explanation: json.explanation || 'Query enhanced for better search results'
      };
    } catch (error) {
      return this.getFallbackEnhancement(originalQuery);
    }
  }

  private parseSuggestions(response: string): SearchSuggestion[] {
    try {
      const json = JSON.parse(this.extractJsonFromResponse(response));
      return Array.isArray(json) ? json : [];
    } catch (error) {
      return [];
    }
  }

  private parseSummary(response: string): ContentSummary {
    try {
      const json = JSON.parse(this.extractJsonFromResponse(response));
      return {
        summary: json.summary || 'No summary available',
        keyPoints: json.keyPoints || [],
        tags: json.tags || [],
        sentiment: json.sentiment || 'neutral',
        complexity: json.complexity || 'intermediate'
      };
    } catch (error) {
      return this.getFallbackSummary('', '');
    }
  }

  private extractJsonFromResponse(response: string): string {
    // Extract JSON from markdown code blocks or plain response
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                     response.match(/(\{[\s\S]*\})/);
    return jsonMatch ? jsonMatch[1] : response;
  }

  // Fallback methods for when Gemini is not available
  private getFallbackEnhancement(query: string): QueryEnhancement {
    const words = query.toLowerCase().split(/\s+/);
    const enhancedQuery = words.map(word => {
      // Simple synonym expansion
      const synonyms: Record<string, string[]> = {
        'ml': ['machine learning', 'artificial intelligence'],
        'ai': ['artificial intelligence', 'machine learning'],
        'doc': ['document', 'file'],
        'api': ['application programming interface', 'endpoint']
      };
      return synonyms[word] ? synonyms[word].join(' ') : word;
    }).join(' ');

    return {
      originalQuery: query,
      enhancedQuery,
      intent: 'search',
      suggestedFilters: {},
      confidence: 0.6,
      explanation: 'Basic query enhancement (Gemini unavailable)'
    };
  }

  private getFallbackSuggestions(query: string): SearchSuggestion[] {
    const baseSuggestions = [
      `${query} tutorial`,
      `${query} example`,
      `${query} documentation`,
      `${query} best practices`,
      `advanced ${query}`
    ];

    return baseSuggestions.map((suggestion, index) => ({
      suggestion,
      category: ['related', 'specific', 'broader', 'refined', 'specific'][index] as any,
      confidence: 0.5 + (index * 0.1)
    }));
  }

  private getFallbackSummary(content: string, title: string): ContentSummary {
    const words = content.split(/\s+/).slice(0, 100);
    const summary = words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : '');
    
    return {
      summary,
      keyPoints: [title, 'Content available for review'],
      tags: ['document', 'file'],
      sentiment: 'neutral',
      complexity: 'intermediate'
    };
  }

  private getFallbackIntent(query: string): any {
    const words = query.toLowerCase().split(/\s+/);
    const searchTerms = ['find', 'search', 'look', 'show'];
    const filterTerms = ['filter', 'where', 'type', 'recent'];
    
    let intent = 'search';
    if (words.some(word => filterTerms.includes(word))) intent = 'filter';
    if (words.some(word => searchTerms.includes(word))) intent = 'search';

    return {
      intent,
      entities: words.filter(word => word.length > 3),
      confidence: 0.6,
      recommendations: ['Try more specific terms', 'Use file type filters']
    };
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }
}

export default GeminiSearchService;