import { MCPManager } from './MCPManager.js';
import type { FileContent, SearchQuery, SearchResult } from '../shared/types/index.js';

export class MCPIntegration {
  private mcpManager: MCPManager;

  constructor(mcpManager: MCPManager) {
    this.mcpManager = mcpManager;
  }

  // File system operations
  async searchFiles(query: SearchQuery): Promise<SearchResult[]> {
    try {
      const response = await this.mcpManager.sendRequest('search', {
        method: 'search',
        params: {
          query: query.text,
          path: query.path || './test-files',
          options: {
            fuzzy: true,
            semantic: true,
            max_results: query.limit || 50
          }
        }
      });

      return response.results || [];
    } catch (error) {
      console.error('MCP file search error:', error);
      return [];
    }
  }

  // Enhanced file content reading
  async readFileContent(filePath: string): Promise<FileContent | null> {
    try {
      const response = await this.mcpManager.sendRequest('filesystem', {
        method: 'read_file',
        params: {
          path: filePath,
          options: {
            extract_metadata: true,
            content_analysis: true
          }
        }
      });

      return response.content || null;
    } catch (error) {
      console.error('MCP file read error:', error);
      return null;
    }
  }

  // AI-enhanced content analysis
  async analyzeContent(content: string, contentType: string): Promise<any> {
    try {
      const response = await this.mcpManager.sendRequest('ai_filesystem', {
        method: 'analyze_content',
        params: {
          content,
          content_type: contentType,
          options: {
            extract_entities: true,
            classify_intent: true,
            generate_summary: true
          }
        }
      });

      return response.analysis || {};
    } catch (error) {
      console.error('MCP content analysis error:', error);
      return {};
    }
  }

  // Documentation search
  async searchDocumentation(query: string): Promise<any[]> {
    try {
      const response = await this.mcpManager.sendRequest('documentation', {
        method: 'search_docs',
        params: {
          query,
          options: {
            semantic_threshold: 0.7,
            max_results: 20
          }
        }
      });

      return response.results || [];
    } catch (error) {
      console.error('MCP documentation search error:', error);
      return [];
    }
  }
}
