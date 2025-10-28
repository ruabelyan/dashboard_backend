export interface ImportStats {
    total: number;
    imported: number;
    skipped: number;
    errors: number;
    duplicates: number;
    processingTime: number;
}
export interface ImportOptions {
    batchSize?: number;
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    dryRun?: boolean;
}
export declare class EasyPayDataImporter {
    private jsonPath;
    private stats;
    constructor(jsonPath?: string);
    /**
     * Import all EasyPay clients from JSON file
     */
    importAll(options?: ImportOptions): Promise<ImportStats>;
    /**
     * Analyze data without importing (dry run)
     */
    private analyzeData;
    /**
     * Create batches for processing
     */
    private createBatches;
    /**
     * Process a batch of clients
     */
    private processBatch;
    /**
     * Process a single client
     */
    private processClient;
    /**
     * Check if client already exists
     */
    private checkExistingClient;
    /**
     * Insert new client
     */
    private insertClient;
    /**
     * Update existing client
     */
    private updateClient;
    /**
     * Get import statistics
     */
    getStats(): ImportStats;
    /**
     * Reset statistics
     */
    resetStats(): void;
}
export default EasyPayDataImporter;
//# sourceMappingURL=EasyPayDataImporter.d.ts.map