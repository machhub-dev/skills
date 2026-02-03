// filepath: src/services/batch-operations.service.ts
import { getOrInitializeSDK } from './sdk.service';
import type { SDK } from '@machhub-dev/sdk-ts';

export interface BatchResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface BatchResults<T> {
    successful: T[];
    failed: Array<{ data: any; error: string; }>;
    total: number;
    successCount: number;
    failedCount: number;
}

class BatchOperationsService {
    private sdk: SDK | null = null;

    private async getSDK(): Promise<SDK> {
        if (!this.sdk) {
            this.sdk = await getOrInitializeSDK();
        }
        return this.sdk;
    }

    /**
     * Create multiple records in batch
     */
    async batchCreate<T>(
        collectionName: string,
        records: Partial<T>[],
        options?: {
            continueOnError?: boolean;
            chunkSize?: number;
        }
    ): Promise<BatchResults<T>> {
        const results: BatchResults<T> = {
            successful: [],
            failed: [],
            total: records.length,
            successCount: 0,
            failedCount: 0
        };

        const sdk = await this.getSDK();
        const chunkSize = options?.chunkSize || 10;
        const continueOnError = options?.continueOnError !== false;

        // Process in chunks
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(async (record) => {
                try {
                    const created = await sdk.collection(collectionName).create(record);
                    return { success: true, data: created };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message || 'Unknown error',
                        data: record
                    };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);

            for (const result of chunkResults) {
                if (result.success && result.data) {
                    results.successful.push(result.data);
                    results.successCount++;
                } else {
                    results.failed.push({
                        data: result.data,
                        error: result.error || 'Unknown error'
                    });
                    results.failedCount++;

                    if (!continueOnError) {
                        return results;
                    }
                }
            }
        }

        return results;
    }

    /**
     * Update multiple records in batch
     */
    async batchUpdate<T>(
        collectionName: string,
        updates: Array<{ id: string; data: Partial<T>; }>,
        options?: {
            continueOnError?: boolean;
            chunkSize?: number;
            appName?: string;
        }
    ): Promise<BatchResults<T>> {
        const results: BatchResults<T> = {
            successful: [],
            failed: [],
            total: updates.length,
            successCount: 0,
            failedCount: 0
        };

        const sdk = await this.getSDK();
        const chunkSize = options?.chunkSize || 10;
        const continueOnError = options?.continueOnError !== false;
        const appName = options?.appName || 'myapp';

        for (let i = 0; i < updates.length; i += chunkSize) {
            const chunk = updates.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(async ({ id, data }) => {
                try {
                    const fullId = `${appName}.${collectionName}:${id}`;
                    const updated = await sdk.collection(collectionName).update(fullId, data);
                    return { success: true, data: updated };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message || 'Unknown error',
                        data: { id, ...data }
                    };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);

            for (const result of chunkResults) {
                if (result.success && result.data) {
                    results.successful.push(result.data);
                    results.successCount++;
                } else {
                    results.failed.push({
                        data: result.data,
                        error: result.error || 'Unknown error'
                    });
                    results.failedCount++;

                    if (!continueOnError) {
                        return results;
                    }
                }
            }
        }

        return results;
    }

    /**
     * Delete multiple records in batch
     */
    async batchDelete(
        collectionName: string,
        ids: string[],
        options?: {
            continueOnError?: boolean;
            chunkSize?: number;
            appName?: string;
        }
    ): Promise<BatchResults<{ id: string; }>> {
        const results: BatchResults<{ id: string; }> = {
            successful: [],
            failed: [],
            total: ids.length,
            successCount: 0,
            failedCount: 0
        };

        const sdk = await this.getSDK();
        const chunkSize = options?.chunkSize || 10;
        const continueOnError = options?.continueOnError !== false;
        const appName = options?.appName || 'myapp';

        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(async (id) => {
                try {
                    const fullId = `${appName}.${collectionName}:${id}`;
                    await sdk.collection(collectionName).delete(fullId);
                    return { success: true, data: { id } };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message || 'Unknown error',
                        data: { id }
                    };
                }
            });

            const chunkResults = await Promise.all(chunkPromises);

            for (const result of chunkResults) {
                if (result.success && result.data) {
                    results.successful.push(result.data);
                    results.successCount++;
                } else {
                    results.failed.push({
                        data: result.data,
                        error: result.error || 'Unknown error'
                    });
                    results.failedCount++;

                    if (!continueOnError) {
                        return results;
                    }
                }
            }
        }

        return results;
    }
}

export const batchOperationsService = new BatchOperationsService();
