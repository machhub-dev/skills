---
name: machhub-collection-json
description: Generate valid MACHHUB Collection schemas in JSON format with proper data types, relations, indexes, and onDelete behaviors for database import and schema management.
---

# MACHHUB Collections JSON Import Skill

## Skill Overview

This skill enables AI assistants to generate valid MACHHUB Collection schemas in JSON format for importing into MACHHUB database. It covers proper data type selection, relation configurations, index definitions, and onDelete behaviors aligned with MACHHUB's Collection import system.

## When to Use This Skill

Use this skill when:
- Creating new MACHHUB collections programmatically
- Generating collection schemas from requirements
- Migrating or backing up collection structures
- Setting up database schemas for MACHHUB-based applications
- Designing normalized or denormalized data models for MACHHUB
- Bulk creation of multiple collections
- Migrating collections between environments
- Sharing collection schemas
- Backing up and restoring collection structures

## Core Concepts

### JSON Structure Requirements

Collections are defined as a JSON **array** of collection objects. Each collection must include:
- `name` (required): Unique collection name
- `description` (optional): Purpose description
- `fields` (required): Array of field definitions
- `indexDetails` (optional): Array of index configurations

### Standard Fields Pattern

**CRITICAL**: Every collection must include these standard fields:
```json
{
  "name": "id",
  "type": "record",
  "required": true,
  "onDelete": "ignore"
},
{
  "name": "created_dt",
  "type": "date",
  "required": false,
  "onDelete": "ignore"
},
{
  "name": "updated_dt",
  "type": "date",
  "required": false,
  "onDelete": "ignore"
}
```

These fields are automatically managed by MACHHUB backend.

## Data Types

### Basic Types

| Type      | Use Case                        | Example Fields                        |
| --------- | ------------------------------- | ------------------------------------- |
| `string`  | Plain text, codes, statuses     | name, description, status, sku        |
| `url`     | URL strings (validated)         | website, documentUrl                  |
| `file`    | File paths/references           | attachmentPath, logoFile              |
| `editor`  | Rich text content               | htmlContent, emailBody                |
| `number`  | Integers or decimals            | quantity, price, age                  |
| `boolean` | True/false flags                | isActive, isVerified                  |
| `date`    | Date and time values            | dueDate, startDate, timestamp         |
| `json`    | JSON objects or arrays          | metadata, configuration, customFields |
| `record`  | Record ID (for `id` field only) | id                                    |

### Relation Type (Foreign Keys)

**USE `relation` TYPE FOR ALL FOREIGN KEYS** - not `string` or `record`

```json
{
  "name": "customerId",
  "type": "relation",
  "relatedCollectionID": {
    "Table": "collections",
    "ID": "customer_collection_id_here"
  },
  "relationLinkType": "single",
  "required": true,
  "onDelete": "cascade"
}
```

**Relation Properties:**
- `relatedCollectionID`: Object with `Table` (always "collections") and `ID` (target collection ID)
- `relationLinkType`: `"single"` (one-to-one/many-to-one) or `"multiple"` (one-to-many)
- `onDelete`: Deletion behavior (see below)

**Common Mistake:**
```json
// ❌ WRONG
{
  "name": "userId",
  "type": "record",
  "required": true,
  "onDelete": "ignore"
}

// ✅ CORRECT
{
  "name": "userId",
  "type": "relation",
  "relatedCollectionID": {
    "Table": "collections",
    "ID": "users_collection_id"
  },
  "relationLinkType": "single",
  "required": true,
  "onDelete": "cascade"
}
```

## onDelete Behaviors

Choose the appropriate behavior based on referential integrity needs:

| Behavior  | Description                                     | Use Case                                                                 |
| --------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `ignore`  | Does nothing when related record deleted        | Optional/historical references, soft relationships                       |
| `unset`   | Sets field to null when related record deleted  | Optional relations that become null                                      |
| `cascade` | Deletes this record when related record deleted | Dependent child records (e.g., order_items when order deleted)           |
| `reject`  | Prevents deletion if this record exists         | Protected parent records (e.g., can't delete category if products exist) |

**Examples:**
- `cascade`: Order items when order is deleted, comments when post is deleted
- `reject`: Categories referenced by products, users referenced by audit logs
- `ignore`: Historical records, audit trails, archived references
- `unset`: Optional manager reference, optional secondary contact

## Index Configurations

### Index Types

**Unique Index** (`isUnique: true`)
- Enforces uniqueness constraint
- Use for: email addresses, serial numbers, SKUs, order numbers
```json
{
  "fields": ["serialNumber"],
  "isUnique": true,
  "query": ""
}
```

**Performance Index** (`isUnique: false`)
- Improves query speed, no uniqueness enforcement
- Use for: status fields, foreign keys, frequently filtered fields
```json
{
  "fields": ["status"],
  "isUnique": false,
  "query": ""
}
```

**Composite Index**
- Multiple fields in one index
- Use for: unique combinations, compound queries
```json
{
  "fields": ["email", "tenantId"],
  "isUnique": true,
  "query": ""
}
```

### When to Create Indexes

**Always index:**
- Foreign key fields for join performance
- Status/state fields used in filtering
- Unique identifiers (email, serial number, etc.)
- Date fields used in sorting or range queries

**Example:**
```json
"indexDetails": [
  {
    "fields": ["email"],
    "isUnique": true,
    "query": ""
  },
  {
    "fields": ["customerId"],
    "isUnique": false,
    "query": ""
  },
  {
    "fields": ["status"],
    "isUnique": false,
    "query": ""
  }
]
```

## Data Modeling Patterns

### Pattern 1: Normalized (Junction Table Only)

**Use when:**
- Strict referential integrity required
- Child records must always have valid parent relationships
- Storage optimization is priority

**Example: Stock movements referencing item_location only**
```json
{
  "name": "stock_movements",
  "fields": [
    // ... standard fields ...
    {
      "name": "itemLocationId",
      "type": "relation",
      "relatedCollectionID": {
        "Table": "collections",
        "ID": "item_location_collection_id"
      },
      "relationLinkType": "single",
      "required": true,
      "onDelete": "cascade"
    },
    {
      "name": "quantity",
      "type": "number",
      "required": true,
      "onDelete": "ignore"
    }
  ]
}
```

**Query parent through join:** `stockMovement.itemLocation.itemId`

### Pattern 2: Denormalized (Direct + Junction Relations)

**Use when:**
- Query performance is critical
- Need flexibility (pending/workflow states)
- Frequent parent queries regardless of junction status
- Analytics and reporting requirements

**Example: Stock movements with both itemId and itemLocationId**
```json
{
  "name": "stock_movements",
  "fields": [
    // ... standard fields ...
    {
      "name": "itemId",
      "type": "relation",
      "relatedCollectionID": {
        "Table": "collections",
        "ID": "items_collection_id"
      },
      "relationLinkType": "single",
      "required": true,
      "onDelete": "cascade"
    },
    {
      "name": "itemLocationId",
      "type": "relation",
      "relatedCollectionID": {
        "Table": "collections",
        "ID": "item_location_collection_id"
      },
      "relationLinkType": "single",
      "required": false,
      "onDelete": "ignore"
    },
    {
      "name": "quantity",
      "type": "number",
      "required": true,
      "onDelete": "ignore"
    }
  ]
}
```

**Direct query:** `stockMovement.itemId` (no joins needed)

### Choosing Between Patterns

**Normalized (Pattern 1):**
- ✅ Transactional systems with strict integrity
- ✅ Storage-constrained environments
- ✅ Records always have valid junction relationships

**Denormalized (Pattern 2):**
- ✅ Analytics and reporting systems
- ✅ Audit trails and event logs
- ✅ Workflow states (pending, in-transit, etc.)
- ✅ Performance-critical queries

## Common Patterns

### One-to-One Relation
Used when one record in Collection A relates to exactly one record in Collection B (e.g., user → user_profile).

```json
{
  "name": "user_profile",
  "type": "relation",
  "relatedCollectionID": {
    "Table": "collections",
    "ID": "user_collection_id"
  },
  "relationLinkType": "single",
  "required": true,
  "onDelete": "cascade"
}
```

### One-to-Many Relation
Used when one record in Collection A can relate to multiple records in Collection B (e.g., order → order_items).

```json
{
  "name": "order_items",
  "type": "relation",
  "relatedCollectionID": {
    "Table": "collections",
    "ID": "items_collection_id"
  },
  "relationLinkType": "multiple",
  "required": false,
  "onDelete": "ignore"
}
```

### Unique Composite Index
Used to enforce uniqueness across multiple fields combined (e.g., email + domain must be unique together).

```json
{
  "fields": ["email", "domain_id"],
  "isUnique": true,
  "query": ""
}
```

### Performance Index (Non-Unique)
Used to speed up queries on frequently filtered fields without enforcing uniqueness.

```json
{
  "fields": ["status"],
  "isUnique": false,
  "query": ""
}
```

## Code Generation Workflow

### Step 1: Gather Context

**Required Information:**
1. List of existing collections with IDs
2. Field naming conventions
3. Relationship requirements
4. Business rules and constraints

**Example Context:**
```
Existing collections:
- users (ID: abc123)
- products (ID: def456)
- warehouses (ID: ghi789)

Conventions:
- camelCase field names
- Use "Id" suffix for relations (e.g., userId, productId)
- Always include created_dt, updated_dt

Requirements:
- Orders belong to users (cascade delete)
- Order items belong to orders (cascade delete)
- Order items reference products (ignore delete)
- Order numbers must be unique
```

### Step 2: Generate Schema

**Template for AI Generation:**
```
Generate a MACHHUB collection schema for [collection_name]:

Context:
- Existing collections: [list with IDs]
- Parent collection: [name] (ID: [id])
- Relation behavior: [cascade/reject/ignore]

Requirements:
- [List business requirements]
- [List field requirements]
- [List uniqueness constraints]

Use MACHHUB Collection JSON format with:
- Standard fields (id, created_dt, updated_dt)
- Proper relation types with relatedCollectionID
- Appropriate onDelete behaviors
- Necessary indexes
```

### Step 3: Validate Output

**Checklist:**
- ✅ JSON syntax is valid
- ✅ Standard fields included (id, created_dt, updated_dt)
- ✅ All foreign keys use `relation` type (not `string` or `record`)
- ✅ `relatedCollectionID` has correct structure
- ✅ `relationLinkType` is "single" or "multiple"
- ✅ `onDelete` behaviors match requirements
- ✅ Unique indexes for identifiers
- ✅ Performance indexes for foreign keys and frequently queried fields

## Complete Example

### Simple Parent Collection

```json
[
  {
    "name": "customers",
    "description": "Customer master data",
    "fields": [
      {
        "name": "id",
        "type": "record",
        "required": true,
        "onDelete": "ignore"
      },
      {
        "name": "companyName",
        "type": "string",
        "required": true,
        "onDelete": "ignore"
      },
      {
        "name": "email",
        "type": "string",
        "required": true,
        "onDelete": "ignore"
      },
      {
        "name": "phone",
        "type": "string",
        "required": false,
        "onDelete": "ignore"
      },
      {
        "name": "status",
        "type": "string",
        "required": false,
        "onDelete": "ignore"
      },
      {
        "name": "created_dt",
        "type": "date",
        "required": false,
        "onDelete": "ignore"
      },
      {
        "name": "updated_dt",
        "type": "date",
        "required": false,
        "onDelete": "ignore"
      }
    ],
    "indexDetails": [
      {
        "fields": ["email"],
        "isUnique": true,
        "query": ""
      },
      {
        "fields": ["status"],
        "isUnique": false,
        "query": ""
      }
    ]
  }
]
```

### Complex Child Collection with Relations

```json
[
  {
    "name": "orders",
    "description": "Customer orders",
    "fields": [
      {
        "name": "id",
        "type": "record",
        "required": true,
        "onDelete": "ignore"
      },
      {
        "name": "orderNumber",
        "type": "string",
        "required": true,
        "onDelete": "ignore"
      },
      {
        "name": "customerId",
        "type": "relation",
        "relatedCollectionID": {
          "Table": "collections",
          "ID": "customers_collection_id"
        },
        "relationLinkType": "single",
        "required": true,
        "onDelete": "cascade"
      },
      {
        "name": "status",
        "type": "string",
        "required": true,
        "onDelete": "ignore"
      },
      {
        "name": "totalAmount",
        "type": "number",
        "required": false,
        "onDelete": "ignore"
      },
      {
        "name": "orderDate",
        "type": "date",
        "required": true,
        "onDelete": "ignore"
      },
      {
        "name": "created_dt",
        "type": "date",
        "required": false,
        "onDelete": "ignore"
      },
      {
        "name": "updated_dt",
        "type": "date",
        "required": false,
        "onDelete": "ignore"
      }
    ],
    "indexDetails": [
      {
        "fields": ["orderNumber"],
        "isUnique": true,
        "query": ""
      },
      {
        "fields": ["customerId"],
        "isUnique": false,
        "query": ""
      },
      {
        "fields": ["status"],
        "isUnique": false,
        "query": ""
      },
      {
        "fields": ["orderDate"],
        "isUnique": false,
        "query": ""
      }
    ]
  }
]
```

## Best Practices

### 1. Naming Conventions
- Use camelCase for field names
- End relation field names with "Id" (e.g., `userId`, `orderId`)
- Use descriptive collection names (plural: `users`, `orders`, `products`)

### 2. Required vs Optional
- Make relations `required: true` if they're essential (e.g., order must have customer)
- Make relations `required: false` if they're optional (e.g., optional manager reference)

### 3. Index Strategy
- Unique index: Identifiers that must be unique
- Performance index: Foreign keys and frequently filtered fields
- Composite index: Unique combinations (e.g., email + tenantId)

### 4. Deletion Strategy
- `cascade`: For dependent children (order_items → orders)
- `reject`: For protected parents (categories ← products)
- `ignore`: For historical/audit references
- `unset`: For optional relations that become null

### 5. Collection Creation Order
1. Create parent collections first (e.g., users, products)
2. Note collection IDs from response
3. Create child collections using parent IDs in relations
4. Create junction tables last (e.g., user_roles, item_location)

## Common Pitfalls

❌ **Using `record` type for foreign keys**
```json
// WRONG
{"name": "userId", "type": "record"}
```

✅ **Use `relation` type instead**
```json
// CORRECT
{"name": "userId", "type": "relation", "relatedCollectionID": {...}}
```

❌ **Missing standard fields**
- Always include `id`, `created_dt`, `updated_dt`

❌ **Wrong relationLinkType**
- Use `"single"` for many-to-one or one-to-one
- Use `"multiple"` for one-to-many

❌ **Forgetting indexes**
- Index foreign keys for join performance
- Index unique identifiers with `isUnique: true`

## Integration with MACHHUB

### Import Methods

**Method 1: Paste JSON Directly**
1. Navigate to **Database → Collections → Import**
2. Paste your JSON array into the Monaco editor
3. Click **Import Collections**

**Method 2: Upload JSON File**
1. Navigate to **Database → Collections → Import**
2. Click the **Load from JSON file** button
3. Select your `.json` file
4. Review the loaded content
5. Click **Import Collections**

### Export Existing Collections

```
Database → Collections → Export → Select Collections → Download/Copy JSON
```

Exported JSON can be:
- Modified and re-imported
- Shared with team
- Used as backups
- Migrated between environments

## Troubleshooting

| Issue             | Solution                                            |
| ----------------- | --------------------------------------------------- |
| Import fails      | Validate JSON syntax, check all required fields     |
| Relation error    | Verify collection ID exists, check relationLinkType |
| Unique constraint | Ensure no duplicate values for unique index fields  |
| Field not found   | Verify fields in indexDetails exist in fields array |

### Common Import Issues

**Invalid JSON format**
- Validate JSON syntax using a JSON validator
- Ensure proper array structure with square brackets
- Check for missing commas or quotes

**Missing required fields**
- Ensure `id` field with type `record` exists in every collection
- Include `name` and `fields` properties for each collection

**Collection already exists**
- Collections with the same name cannot be duplicated
- Use unique names or delete existing collection first

**Relation Errors**
- Invalid collection ID: Verify the `relatedCollectionID.ID` exists
- Wrong relation type: Check if `relationLinkType` is correctly set to "single" or "multiple"
- Table property: Ensure `relatedCollectionID.Table` is always "collections"

**Index Conflicts**
- Unique constraint violation: If `isUnique: true`, ensure no duplicate values exist in data
- Field doesn't exist: Verify all fields in `indexDetails` are defined in `fields` array
- Invalid index syntax: Check field names match exactly

## Important Notes

- **Collection IDs**: When importing, `id` and `domain_id` fields are automatically generated by the system and should not be included in the JSON
- **Order matters**: For collections with relations, create parent collections before child collections to get their IDs
- **Bulk import**: The import process creates all collections sequentially; check the console for any failures
- **Validation**: The system validates each collection before creation; invalid collections will be skipped with error messages
- **Automatic fields**: The backend automatically manages `id`, `created_dt`, and `updated_dt` fields - you just need to define them
- **Case sensitivity**: Field names and collection names are case-sensitive

## Related Routes

- Import: `/database/collections/import`
- Export: `/database/collections/export`
- Collections List: `/database/collections`

## Related Skills

- **machhub-typescript-sdk**: For working with collections programmatically
- **shadcn-svelte**: For building UIs that interact with MACHHUB collections

## Usage Example Prompts

**Prompt 1: Simple collection**
```
Create a MACHHUB collection schema for "vendors" with fields:
- companyName (required string)
- email (unique string)
- phone (optional string)
- status (string, indexed)
Include standard fields and appropriate indexes.
```

**Prompt 2: Collection with relations**
```
Create a MACHHUB "purchase_orders" collection that:
- References vendors collection (ID: abc123, cascade delete)
- Has unique poNumber field
- Has status field (indexed for filtering)
- Has orderDate (date, required)
- Includes standard timestamp fields
```

**Prompt 3: Junction table**
```
Create a MACHHUB "user_roles" junction table:
- References users (ID: users_id, reject delete)
- References roles (ID: roles_id, reject delete)
- userId + roleId combination must be unique (composite index)
- Include assignedDate field
- Use standard fields
```
