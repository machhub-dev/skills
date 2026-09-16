// filepath: src/utils/relationship-handler.ts

export interface RecordID {
    Table: string;
    ID: string;
}

export class RelationshipHandler {
    /**
     * Create RecordID reference
     */
    static createReference(table: string, id: string): RecordID {
        return {
            Table: table,
            ID: id
        };
    }

    /**
     * Create reference with app prefix
     */
    static createAppReference(collectionName: string, id: string, appName = 'myapp'): RecordID {
        return {
            Table: `${appName}.${collectionName}`,
            ID: id
        };
    }

    /**
     * Extract ID from RecordID or string
     */
    static extractId(value: any): string {
        if (typeof value === 'object' && value?.ID) {
            return value.ID;
        }
        if (typeof value === 'string' && value.includes(':')) {
            return value.split(':')[1];
        }
        return value;
    }

    /**
     * Extract table name from RecordID
     */
    static extractTable(value: any): string | null {
        if (typeof value === 'object' && value?.Table) {
            return value.Table;
        }
        if (typeof value === 'string' && value.includes(':')) {
            return value.split(':')[0];
        }
        return null;
    }

    /**
     * Check if value is a valid RecordID
     */
    static isRecordID(value: any): value is RecordID {
        return (
            typeof value === 'object' &&
            value !== null &&
            'Table' in value &&
            'ID' in value &&
            typeof value.Table === 'string' &&
            typeof value.ID === 'string'
        );
    }

    /**
     * Convert RecordID to full string format
     */
    static toFullId(recordId: RecordID): string {
        return `${recordId.Table}:${recordId.ID}`;
    }

    /**
     * Parse full ID string to RecordID
     */
    static parseFullId(fullId: string): RecordID | null {
        if (!fullId.includes(':')) return null;

        const [table, id] = fullId.split(':');
        return {
            Table: table,
            ID: id
        };
    }

    /**
     * Convert array of IDs to RecordID references
     */
    static toReferences(table: string, ids: string[]): RecordID[] {
        return ids.map(id => this.createReference(table, id));
    }

    /**
     * Extract IDs from array of RecordIDs
     */
    static extractIds(values: any[]): string[] {
        return values.map(value => this.extractId(value));
    }

    /**
     * Transform object with RecordID fields to plain IDs
     */
    static transformToPlainIds<T extends Record<string, any>>(
        obj: T,
        fields: (keyof T)[]
    ): T {
        const result = { ...obj };

        for (const field of fields) {
            if (result[field]) {
                if (Array.isArray(result[field])) {
                    result[field] = this.extractIds(result[field]) as any;
                } else {
                    result[field] = this.extractId(result[field]) as any;
                }
            }
        }

        return result;
    }

    /**
     * Transform object with plain IDs to RecordID references
     */
    static transformToReferences<T extends Record<string, any>>(
        obj: T,
        fieldMap: Record<keyof T, string>
    ): T {
        const result = { ...obj };

        for (const [field, table] of Object.entries(fieldMap)) {
            if (result[field]) {
                if (Array.isArray(result[field])) {
                    result[field] = this.toReferences(table, result[field]) as any;
                } else {
                    result[field] = this.createReference(table, result[field]) as any;
                }
            }
        }

        return result;
    }
}
