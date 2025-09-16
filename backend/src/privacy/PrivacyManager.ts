/**
 * Privacy Manager for Enhanced Local Processing
 * Inspired by SimStudio's privacy-first approach with local model capabilities
 */

import { createLogger } from '../shared/utils/logger.js';
import { getModelRegistry } from '../ai/models/ModelRegistry.js';
import type { 
  ModelDefinition, 
  EmbeddingOptions, 
  EmbeddingResult,
  ModelInferenceOptions,
  ModelInferenceResult 
} from '../ai/providers/types.js';

const logger = createLogger('PrivacyManager');

export type PrivacyMode = 'STRICT_LOCAL' | 'HYBRID' | 'CLOUD_PREFERRED' | 'ADAPTIVE';

export type DataSensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface PrivacyConfiguration {
  mode: PrivacyMode;
  allowCloudProcessing: boolean;
  allowCloudStorage: boolean;
  allowTelemetry: boolean;
  encryptSensitiveData: boolean;
  localModelPreference: boolean;
  sensitivityThreshold: DataSensitivity;
  approvedCloudProviders: string[];
  blockedCloudProviders: string[];
  dataRetentionDays: number;
  auditLevel: 'NONE' | 'BASIC' | 'DETAILED';
}

export interface DataClassification {
  sensitivity: DataSensitivity;
  containsPII: boolean;
  containsCredentials: boolean;
  containsProprietaryData: boolean;
  requiresEncryption: boolean;
  allowCloudProcessing: boolean;
  retentionPeriod?: number;
}

export interface PrivacyAuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'DATA_PROCESSED' | 'DATA_STORED' | 'DATA_TRANSMITTED' | 'MODEL_INFERENCE';
  dataType: string;
  sensitivity: DataSensitivity;
  processingLocation: 'LOCAL' | 'CLOUD';
  provider?: string;
  encrypted: boolean;
  approved: boolean;
  reason?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface LocalProcessingCapabilities {
  textGeneration: boolean;
  embeddingGeneration: boolean;
  documentAnalysis: boolean;
  semanticSearch: boolean;
  contentClassification: boolean;
  dataExtraction: boolean;
  estimatedPerformance: 'LOW' | 'MEDIUM' | 'HIGH';
  supportedFormats: string[];
  maxDocumentSize: number;
  concurrentProcessing: number;
}

export class PrivacyManager {
  private config: PrivacyConfiguration;
  private auditLog: PrivacyAuditEvent[] = [];
  private dataClassifier: DataClassifier;
  private localCapabilities: LocalProcessingCapabilities;

  constructor(config: Partial<PrivacyConfiguration> = {}) {
    this.config = {
      mode: 'HYBRID',
      allowCloudProcessing: false,
      allowCloudStorage: false,
      allowTelemetry: false,
      encryptSensitiveData: true,
      localModelPreference: true,
      sensitivityThreshold: 'INTERNAL',
      approvedCloudProviders: [],
      blockedCloudProviders: [],
      dataRetentionDays: 90,
      auditLevel: 'BASIC',
      ...config
    };

    this.dataClassifier = new DataClassifier();
    this.localCapabilities = this.assessLocalCapabilities();
    
    logger.info('PrivacyManager initialized', { 
      mode: this.config.mode,
      strictLocal: this.config.mode === 'STRICT_LOCAL'
    });
  }

  /**
   * Determine if data can be processed based on privacy settings
   */
  async canProcessData(data: any, processingType: string, provider?: string): Promise<boolean> {
    const classification = await this.classifyData(data);
    const decision = this.makeProcessingDecision(classification, processingType, provider);
    
    await this.auditDataProcessing({
      eventType: 'DATA_PROCESSED',
      dataType: processingType,
      sensitivity: classification.sensitivity,
      processingLocation: provider ? 'CLOUD' : 'LOCAL',
      provider,
      encrypted: classification.requiresEncryption,
      approved: decision.allowed,
      reason: decision.reason
    });

    return decision.allowed;
  }

  /**
   * Get recommended processing approach for given data
   */
  async getProcessingStrategy(data: any, task: string): Promise<ProcessingStrategy> {
    const classification = await this.classifyData(data);
    
    // Check if we must process locally
    if (this.config.mode === 'STRICT_LOCAL' || 
        classification.sensitivity >= this.getSensitivityLevel(this.config.sensitivityThreshold)) {
      return {
        approach: 'LOCAL_ONLY',
        providers: ['ollama'],
        fallback: 'FAIL',
        reasoning: 'Data sensitivity requires local processing'
      };
    }

    // Hybrid approach - prefer local if capable
    if (this.config.localModelPreference && await this.canProcessLocally(task)) {
      return {
        approach: 'LOCAL_PREFERRED',
        providers: ['ollama', ...this.config.approvedCloudProviders],
        fallback: 'CLOUD',
        reasoning: 'Local processing preferred for privacy'
      };
    }

    // Cloud processing allowed
    if (this.config.allowCloudProcessing && classification.allowCloudProcessing) {
      return {
        approach: 'CLOUD_ALLOWED',
        providers: this.config.approvedCloudProviders.filter(p => 
          !this.config.blockedCloudProviders.includes(p)
        ),
        fallback: 'LOCAL',
        reasoning: 'Cloud processing allowed for this data type'
      };
    }

    return {
      approach: 'LOCAL_ONLY',
      providers: ['ollama'],
      fallback: 'FAIL',
      reasoning: 'Privacy settings require local processing'
    };
  }

  /**
   * Generate embeddings with privacy controls
   */
  async generatePrivateEmbeddings(
    texts: string[], 
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const strategy = await this.getProcessingStrategy(texts.join(' '), 'embedding_generation');
    
    if (strategy.approach === 'LOCAL_ONLY' || strategy.approach === 'LOCAL_PREFERRED') {
      return this.generateLocalEmbeddings(texts, options);
    }

    // If cloud processing is allowed and no local models available
    if (strategy.approach === 'CLOUD_ALLOWED' && !await this.canProcessLocally('embedding_generation')) {
      logger.warn('Local embedding generation not available, using cloud with privacy controls');
      return this.generateCloudEmbeddings(texts, options, strategy.providers);
    }

    throw new Error('Cannot generate embeddings: privacy constraints prevent processing');
  }

  /**
   * Perform text inference with privacy controls
   */
  async performPrivateInference(
    prompt: string,
    options: ModelInferenceOptions = {}
  ): Promise<ModelInferenceResult> {
    const strategy = await this.getProcessingStrategy(prompt, 'text_generation');
    const classification = await this.classifyData(prompt);

    // Apply privacy-specific options
    const privacyOptions: ModelInferenceOptions = {
      ...options,
      offlineOnly: strategy.approach === 'LOCAL_ONLY',
      fallbackToLocal: strategy.approach === 'LOCAL_PREFERRED'
    };

    const registry = getModelRegistry();
    const localModels = await registry.getLocalModels();

    if (strategy.approach === 'LOCAL_ONLY' && localModels.length === 0) {
      throw new Error('No local models available for required private processing');
    }

    // Use the most appropriate model based on privacy requirements
    const selectedModel = await this.selectPrivacyCompliantModel(
      strategy, 
      classification,
      'text-generation'
    );

    const startTime = Date.now();
    const provider = registry.findModelProvider(selectedModel.id);
    
    if (!provider) {
      throw new Error(`Provider not found for model: ${selectedModel.id}`);
    }

    try {
      const text = await provider.generateText!(prompt, selectedModel.id, privacyOptions);
      
      const result: ModelInferenceResult = {
        text,
        modelUsed: selectedModel.id,
        providerUsed: provider.definition.id,
        wasOffline: selectedModel.isLocal,
        duration: Date.now() - startTime,
        cached: false
      };

      await this.auditDataProcessing({
        eventType: 'MODEL_INFERENCE',
        dataType: 'text_generation',
        sensitivity: classification.sensitivity,
        processingLocation: selectedModel.isLocal ? 'LOCAL' : 'CLOUD',
        provider: provider.definition.id,
        encrypted: classification.requiresEncryption,
        approved: true,
        metadata: {
          modelId: selectedModel.id,
          promptLength: prompt.length,
          responseLength: text.length
        }
      });

      return result;
    } catch (error) {
      logger.error('Private inference failed', { 
        model: selectedModel.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Classify data sensitivity and processing requirements
   */
  async classifyData(data: any): Promise<DataClassification> {
    return this.dataClassifier.classify(data);
  }

  /**
   * Get current local processing capabilities
   */
  getLocalCapabilities(): LocalProcessingCapabilities {
    return { ...this.localCapabilities };
  }

  /**
   * Update privacy configuration
   */
  async updateConfiguration(updates: Partial<PrivacyConfiguration>): Promise<void> {
    const oldMode = this.config.mode;
    this.config = { ...this.config, ...updates };

    // Reassess capabilities if mode changed
    if (oldMode !== this.config.mode) {
      this.localCapabilities = this.assessLocalCapabilities();
    }

    logger.info('Privacy configuration updated', { 
      oldMode,
      newMode: this.config.mode,
      changes: Object.keys(updates)
    });

    await this.auditDataProcessing({
      eventType: 'DATA_PROCESSED',
      dataType: 'configuration_update',
      sensitivity: 'INTERNAL',
      processingLocation: 'LOCAL',
      encrypted: false,
      approved: true,
      metadata: { changes: updates }
    });
  }

  /**
   * Get privacy audit log
   */
  getAuditLog(limit?: number): PrivacyAuditEvent[] {
    const sorted = [...this.auditLog].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Clear audit log (with retention policy)
   */
  async clearAuditLog(olderThan?: Date): Promise<number> {
    const cutoff = olderThan || new Date(Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000));
    const originalLength = this.auditLog.length;
    
    this.auditLog = this.auditLog.filter(event => event.timestamp > cutoff);
    const removedCount = originalLength - this.auditLog.length;

    if (removedCount > 0) {
      logger.info(`Cleared ${removedCount} audit log entries`, { cutoff });
    }

    return removedCount;
  }

  /**
   * Export privacy report
   */
  generatePrivacyReport(): PrivacyReport {
    const now = new Date();
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const recentEvents = this.auditLog.filter(event => event.timestamp > last30Days);
    const localProcessing = recentEvents.filter(e => e.processingLocation === 'LOCAL').length;
    const cloudProcessing = recentEvents.filter(e => e.processingLocation === 'CLOUD').length;
    
    return {
      generatedAt: now,
      reportPeriod: {
        start: last30Days,
        end: now
      },
      configuration: { ...this.config },
      processingStats: {
        totalOperations: recentEvents.length,
        localProcessing,
        cloudProcessing,
        localPercentage: recentEvents.length > 0 ? (localProcessing / recentEvents.length) * 100 : 0
      },
      sensitivityBreakdown: this.calculateSensitivityBreakdown(recentEvents),
      complianceScore: this.calculateComplianceScore(recentEvents),
      recommendations: this.generateRecommendations()
    };
  }

  // Private methods

  private async canProcessLocally(task: string): Promise<boolean> {
    const registry = getModelRegistry();
    const localModels = await registry.getLocalModels();

    switch (task) {
      case 'embedding_generation':
        return localModels.some(m => m.capabilities.embedding);
      case 'text_generation':
        return localModels.length > 0;
      case 'document_analysis':
        return this.localCapabilities.documentAnalysis;
      default:
        return false;
    }
  }

  private async generateLocalEmbeddings(texts: string[], options: EmbeddingOptions): Promise<EmbeddingResult[]> {
    const registry = getModelRegistry();
    const embeddingModels = (await registry.getLocalModels())
      .filter(m => m.capabilities.embedding);

    if (embeddingModels.length === 0) {
      throw new Error('No local embedding models available');
    }

    const model = embeddingModels[0]; // Use first available local embedding model
    const provider = registry.findModelProvider(model.id);

    if (!provider || !provider.generateEmbedding) {
      throw new Error('Local embedding provider not available');
    }

    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      const startTime = Date.now();
      const embedding = await provider.generateEmbedding(text, model.id);
      
      results.push({
        embedding,
        modelUsed: model.id,
        providerUsed: provider.definition.id,
        wasOffline: true,
        duration: Date.now() - startTime,
        dimensions: embedding.length
      });
    }

    return results;
  }

  private async generateCloudEmbeddings(texts: string[], options: EmbeddingOptions, providers: string[]): Promise<EmbeddingResult[]> {
    // Cloud embedding generation with privacy controls
    // This would implement cloud-based embedding generation while respecting privacy settings
    throw new Error('Cloud embedding generation not implemented in this example');
  }

  private async selectPrivacyCompliantModel(
    strategy: ProcessingStrategy,
    classification: DataClassification,
    task: string
  ): Promise<ModelDefinition> {
    const registry = getModelRegistry();
    
    if (strategy.approach === 'LOCAL_ONLY' || strategy.approach === 'LOCAL_PREFERRED') {
      const localModels = await registry.getLocalModels();
      const suitableModels = localModels.filter(m => {
        if (task === 'text-generation') return true;
        if (task === 'embedding' && m.capabilities.embedding) return true;
        return false;
      });

      if (suitableModels.length === 0) {
        throw new Error(`No suitable local models available for ${task}`);
      }

      // Prefer smaller, more private models for sensitive data
      if (classification.sensitivity === 'RESTRICTED' || classification.sensitivity === 'CONFIDENTIAL') {
        return suitableModels.reduce((smallest, current) => 
          (current.sizeGB || 0) < (smallest.sizeGB || 0) ? current : smallest
        );
      }

      // Otherwise use the most capable model
      return suitableModels[0];
    }

    throw new Error('Cloud model selection not implemented in this example');
  }

  private makeProcessingDecision(
    classification: DataClassification,
    processingType: string,
    provider?: string
  ): { allowed: boolean; reason: string } {
    // Strict local mode - only allow local processing
    if (this.config.mode === 'STRICT_LOCAL') {
      if (provider && provider !== 'ollama') {
        return { allowed: false, reason: 'Strict local mode prevents cloud processing' };
      }
      return { allowed: true, reason: 'Local processing allowed' };
    }

    // Check sensitivity threshold
    if (classification.sensitivity >= this.getSensitivityLevel(this.config.sensitivityThreshold)) {
      if (provider && provider !== 'ollama') {
        return { allowed: false, reason: 'Data too sensitive for cloud processing' };
      }
      return { allowed: true, reason: 'Sensitive data processed locally' };
    }

    // Check cloud processing permissions
    if (provider && !this.config.allowCloudProcessing) {
      return { allowed: false, reason: 'Cloud processing disabled' };
    }

    // Check provider restrictions
    if (provider && this.config.blockedCloudProviders.includes(provider)) {
      return { allowed: false, reason: 'Provider is blocked' };
    }

    if (provider && this.config.approvedCloudProviders.length > 0 && 
        !this.config.approvedCloudProviders.includes(provider)) {
      return { allowed: false, reason: 'Provider not in approved list' };
    }

    return { allowed: true, reason: 'Processing permitted by privacy policy' };
  }

  private getSensitivityLevel(sensitivity: DataSensitivity): number {
    const levels = { 'PUBLIC': 0, 'INTERNAL': 1, 'CONFIDENTIAL': 2, 'RESTRICTED': 3 };
    return levels[sensitivity] || 0;
  }

  private assessLocalCapabilities(): LocalProcessingCapabilities {
    // This would assess actual local processing capabilities
    return {
      textGeneration: true,
      embeddingGeneration: true,
      documentAnalysis: true,
      semanticSearch: true,
      contentClassification: true,
      dataExtraction: true,
      estimatedPerformance: 'MEDIUM',
      supportedFormats: ['txt', 'pdf', 'docx', 'csv', 'json'],
      maxDocumentSize: 100 * 1024 * 1024, // 100MB
      concurrentProcessing: 4
    };
  }

  private async auditDataProcessing(event: Omit<PrivacyAuditEvent, 'id' | 'timestamp'>): Promise<void> {
    if (this.config.auditLevel === 'NONE') {
      return;
    }

    const auditEvent: PrivacyAuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    this.auditLog.push(auditEvent);

    // Keep audit log size manageable
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }

    if (this.config.auditLevel === 'DETAILED') {
      logger.info('Privacy audit event', auditEvent);
    }
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSensitivityBreakdown(events: PrivacyAuditEvent[]): Record<DataSensitivity, number> {
    const breakdown: Record<DataSensitivity, number> = {
      'PUBLIC': 0,
      'INTERNAL': 0,
      'CONFIDENTIAL': 0,
      'RESTRICTED': 0
    };

    events.forEach(event => {
      breakdown[event.sensitivity]++;
    });

    return breakdown;
  }

  private calculateComplianceScore(events: PrivacyAuditEvent[]): number {
    if (events.length === 0) return 100;

    const approvedEvents = events.filter(e => e.approved).length;
    return Math.round((approvedEvents / events.length) * 100);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.config.mode !== 'STRICT_LOCAL' && this.localCapabilities.textGeneration) {
      recommendations.push('Consider enabling strict local mode for maximum privacy');
    }

    if (this.config.allowCloudProcessing && this.config.approvedCloudProviders.length === 0) {
      recommendations.push('Define approved cloud providers to limit data exposure');
    }

    if (!this.config.encryptSensitiveData) {
      recommendations.push('Enable encryption for sensitive data processing');
    }

    return recommendations;
  }
}

// Supporting classes and interfaces

class DataClassifier {
  async classify(data: any): Promise<DataClassification> {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Simple classification based on content patterns
    const containsPII = this.detectPII(text);
    const containsCredentials = this.detectCredentials(text);
    const containsProprietaryData = this.detectProprietaryData(text);
    
    let sensitivity: DataSensitivity = 'PUBLIC';
    if (containsCredentials) {
      sensitivity = 'RESTRICTED';
    } else if (containsPII || containsProprietaryData) {
      sensitivity = 'CONFIDENTIAL';
    } else if (this.appearsSensitive(text)) {
      sensitivity = 'INTERNAL';
    }

    return {
      sensitivity,
      containsPII,
      containsCredentials,
      containsProprietaryData,
      requiresEncryption: sensitivity !== 'PUBLIC',
      allowCloudProcessing: sensitivity === 'PUBLIC' || sensitivity === 'INTERNAL'
    };
  }

  private detectPII(text: string): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{3}-\d{4}\b/ // Phone number
    ];
    
    return piiPatterns.some(pattern => pattern.test(text));
  }

  private detectCredentials(text: string): boolean {
    const credentialPatterns = [
      /password\s*[:=]\s*["']?[^\s"']+/i,
      /api[_-]?key\s*[:=]\s*["']?[^\s"']+/i,
      /secret\s*[:=]\s*["']?[^\s"']+/i,
      /token\s*[:=]\s*["']?[^\s"']+/i,
      /private[_-]?key/i
    ];
    
    return credentialPatterns.some(pattern => pattern.test(text));
  }

  private detectProprietaryData(text: string): boolean {
    const proprietaryKeywords = [
      'confidential', 'proprietary', 'internal use only', 
      'trade secret', 'patent pending', 'copyright'
    ];
    
    const lowerText = text.toLowerCase();
    return proprietaryKeywords.some(keyword => lowerText.includes(keyword));
  }

  private appearsSensitive(text: string): boolean {
    const sensitiveKeywords = [
      'financial', 'medical', 'legal', 'strategy', 
      'competitive', 'merger', 'acquisition'
    ];
    
    const lowerText = text.toLowerCase();
    return sensitiveKeywords.some(keyword => lowerText.includes(keyword));
  }
}

interface ProcessingStrategy {
  approach: 'LOCAL_ONLY' | 'LOCAL_PREFERRED' | 'CLOUD_ALLOWED' | 'HYBRID';
  providers: string[];
  fallback: 'LOCAL' | 'CLOUD' | 'FAIL';
  reasoning: string;
}

interface PrivacyReport {
  generatedAt: Date;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  configuration: PrivacyConfiguration;
  processingStats: {
    totalOperations: number;
    localProcessing: number;
    cloudProcessing: number;
    localPercentage: number;
  };
  sensitivityBreakdown: Record<DataSensitivity, number>;
  complianceScore: number;
  recommendations: string[];
}

export default PrivacyManager;