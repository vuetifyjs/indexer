# Vue Snippets Embedder

A Node.js application designed to efficiently extract, embed, and index Vue component snippets using advanced vector search capabilities with Pinecone.

## Overview

This tool processes Vue component snippets (`.vue` files) and their associated metadata (`.meta.json` files), generates vector embeddings using OpenAI's embedding API, and stores them in a Pinecone vector database for semantic search capabilities.

Key features:
- Efficiently processes Vue component snippets
- Generates vector embeddings with OpenAI
- Implements hybrid search with both dense and sparse vectors
- Indexes snippets in Pinecone for enhanced semantic and keyword search
- Supports batch processing for better API efficiency
- Maintains a cache to avoid redundant processing
- CLI tools for managing and searching vectors

## Prerequisites

- Node.js 20+
- OpenAI API key
- Pinecone API key
- Pinecone index named 'vuetify-docs'

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Build the TypeScript code:
   ```
   pnpm run build
   ```
4. Set up environment variables:
   ```
   export OPENAI_API_KEY=your_openai_api_key
   export PINECONE_API_KEY=your_pinecone_api_key
   ```

## Usage

### Process all snippets

```
node dist/index.js [options]
```

Options:
- `--no-batch` - Disable batch processing (process each snippet individually)
- `--verbose` - Show detailed output
- `--dir, -d <path>` - Specify snippets directory (default: src/snippets)
- `--help, -h` - Show help message

### Process a single snippet

```
node dist/index.js path/to/snippet.vue
```

### Search for vectors

Search for Vue snippets using a hybrid search approach that combines dense vector embeddings for semantic understanding with sparse vectors for keyword matching.

```
node dist/search-vectors.js [options] <search query>
```

Options:
- `--top, -k <number>` - Number of results to return (default: 5)
- `--component, -c <name>` - Filter results by component name
- `--help, -h` - Show help message

The search uses OpenAI's text-embedding-3-small model with both dense and sparse embeddings for better results.

### Delete vectors

```
node dist/delete-vectors.js [options] <id1> [id2] [id3] ...
```

Options:
- `--batch` - Force batch deletion even for a single ID
- `--help, -h` - Show help message

## AI Analysis Tools

In addition to embedding and searching for Vue components, this project includes demo tools that use OpenAI's GPT-4o to analyze Vue components:

### Analyze a single Vue component

```
node dist/demo/analyze-vue-snippet.js <path-to-vue-file>
```

This tool analyzes a single Vue component and provides insights about:
- Component overview
- Props used
- Events emitted
- Usage examples
- Improvement suggestions

### Batch analyze Vue components

```
node dist/demo/batch-analyze-snippets.js [options]
```

Options:
- `--dir, -d <path>` - Specify snippets directory (default: src/snippets)
- `--component, -c <n>` - Filter by component name
- `--help, -h` - Show help message

This tool analyzes multiple Vue components together and provides:
- Component relationships
- Common patterns
- Component category overview
- Development recommendations

## Folder Structure

```
.
├── src/
│   ├── tasks/           # High-level task modules
│   │   ├── embedAll.ts  # Process all snippets
│   │   ├── embedAndSync.ts # Process a single snippet
│   │   └── deleteVector.ts # Delete vector(s)
│   ├── utils/           # Utility modules
│   │   ├── batchProcessor.ts # Batch processing utilities
│   │   ├── fileProcessor.ts  # File processing utilities
│   │   ├── hash.ts     # Content hashing utilities
│   │   ├── openai.ts   # OpenAI API integration
│   │   └── pinecone.ts # Pinecone API integration
│   ├── demo/            # Demo tools using OpenAI for analysis
│   │   ├── analyze-vue-snippet.ts # Single component analyzer
│   │   └── batch-analyze-snippets.ts # Multiple component analyzer
│   ├── index.ts        # Main entry point
│   ├── delete-vectors.ts # Tool to delete vectors
│   └── search-vectors.ts # Tool to search for vectors
│
├── src/snippets/       # Vue component snippets
│   └── v-card/         # Example component directory
│       ├── basic.vue   # Snippet file
│       └── basic.meta.json # Metadata file
│
└── embedding-cache.json # Cache file to avoid redundant processing
```

## Snippet Structure

Each Vue component snippet consists of:

1. **Snippet File** (`.vue`): Contains the Vue component template, script, and styles
2. **Metadata File** (`.meta.json`): Describes the snippet with the following structure:

```json
{
  "id": "unique-snippet-id",
  "component": "v-component-name",
  "tags": ["tag1", "tag2"],
  "title": "Human-readable title",
  "description": "Detailed description of the snippet",
  "category": "Category classification"
}
```

## Batch Processing

For improved efficiency when processing many snippets, the system supports batch processing:

1. First, it reads all snippets and computes hashes to detect changes
2. Then, it generates embeddings in batches for changed snippets
3. Finally, it updates the Pinecone index with batched upserts
4. All operations respect API rate limits for cost efficiency

## Caching Mechanism

To avoid redundant API calls, the system maintains a cache of snippet content hashes in the `embedding-cache.json` file. Only snippets that have changed since the last run will be processed again.

## Vector Search with Dense Embeddings

The system uses OpenAI's text-embedding-3-small model to generate dense embeddings for each snippet. These dense embeddings capture the semantic meaning and contextual understanding of the content.

Note: The system was originally designed with support for hybrid search using both dense and sparse embeddings. However, the 'both' encoding_format option is currently not supported by the OpenAI API. The codebase maintains the interfaces for sparse vector support for future implementation when this feature becomes available.

## Error Handling

The system includes robust error handling to:
- Recover from API failures
- Handle rate limiting
- Log detailed error information
- Continue processing after individual snippet failures

## CI/CD Integration

For GitHub Actions integration, see the workflow file in `.github/workflows/embed.yml`. This allows automatic processing of snippets when changes are pushed to the repository.
