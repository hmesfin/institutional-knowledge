#!/usr/bin/env bun
/**
 * MCP Server Smoke Test
 *
 * Basic test to verify the MCP server can start and tools are available.
 */

async function runTests() {
  console.log('🧪 MCP Server Smoke Test\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Import and list all tools
  console.log('Test 1: Load all MCP tools');
  try {
    const tools = await import('../src/mcp/tools/index.ts');
    const toolNames = Object.keys(tools).filter((k) => k.includes('_tool'));

    console.log('✅ Loaded', toolNames.length, 'MCP tools:');
    toolNames.forEach((name) => {
      const toolName = name.replace('_tool', '').replace('_', ' ');
      console.log('  -', toolName);
    });
    testsPassed++;
  } catch (error) {
    console.log('❌ Failed to load tools:', error);
    testsFailed++;
  }
  console.log();

  // Test 2: Verify tool structure
  console.log('Test 2: Verify tool structure');
  try {
    const { capture_knowledge_tool } = await import('../src/mcp/tools/index.ts');

    const hasName = capture_knowledge_tool.name !== undefined;
    const hasDescription = capture_knowledge_tool.description !== undefined;
    const hasSchema = capture_knowledge_tool.inputSchema !== undefined;

    if (hasName && hasDescription && hasSchema) {
      console.log('✅ Tool structure is valid');
      console.log('  Name:', capture_knowledge_tool.name);
      console.log('  Description:', capture_knowledge_tool.description.substring(0, 60) + '...');
      testsPassed++;
    } else {
      throw new Error('Tool structure invalid');
    }
  } catch (error) {
    console.log('❌ Failed:', error);
    testsFailed++;
  }
  console.log();

  // Test 3: Verify schemas exist
  console.log('Test 3: Verify input schemas');
  try {
    const {
      capture_knowledge_tool,
      semantic_search_tool,
      auto_capture_tool,
      provide_feedback_tool,
    } = await import('../src/mcp/tools/index.ts');

    const hasCaptureSchema = capture_knowledge_tool.inputSchema !== undefined;
    const hasSearchSchema = semantic_search_tool.inputSchema !== undefined;
    const hasAutoSchema = auto_capture_tool.inputSchema !== undefined;
    const hasFeedbackSchema = provide_feedback_tool.inputSchema !== undefined;

    if (hasCaptureSchema && hasSearchSchema && hasAutoSchema && hasFeedbackSchema) {
      console.log('✅ All tools have input schemas defined');
      console.log('  - capture_knowledge: schema defined');
      console.log('  - semantic_search: schema defined');
      console.log('  - auto_capture: schema defined');
      console.log('  - provide_feedback: schema defined');
      testsPassed++;
    } else {
      throw new Error('Some schemas missing');
    }
  } catch (error) {
    console.log('❌ Failed:', error);
    testsFailed++;
  }
  console.log();

  // Test 4: Verify tool properties
  console.log('Test 4: Verify tool properties');
  try {
    const { capture_knowledge_tool, auto_capture_tool } = await import('../src/mcp/tools/index.ts');

    const captureHasProps =
      'name' in capture_knowledge_tool &&
      'description' in capture_knowledge_tool &&
      'inputSchema' in capture_knowledge_tool;

    const autoHasProps =
      'name' in auto_capture_tool &&
      'description' in auto_capture_tool &&
      'inputSchema' in auto_capture_tool;

    if (captureHasProps && autoHasProps) {
      console.log('✅ Tools have required properties');
      console.log('  - name ✓');
      console.log('  - description ✓');
      console.log('  - inputSchema ✓');
      testsPassed++;
    } else {
      throw new Error('Tool properties missing');
    }
  } catch (error) {
    console.log('❌ Failed:', error);
    testsFailed++;
  }
  console.log();

  // Test 5: Server can create database
  console.log('Test 5: Database initialization');
  try {
    const { initializeDb, runMigrations } = await import('../src/db/schema');
    const fs = require('fs');

    const db = initializeDb('./test-smoke.db');
    runMigrations(db);

    if (fs.existsSync('./test-smoke.db')) {
      console.log('✅ Database created successfully');
      db.close();
      fs.unlinkSync('./test-smoke.db');
      testsPassed++;
    } else {
      throw new Error('Database file not created');
    }
  } catch (error) {
    console.log('❌ Failed:', error);
    testsFailed++;
  }
  console.log();

  // Test 6: Verify all tool names
  console.log('Test 6: Verify expected tool names');
  try {
    const tools = await import('../src/mcp/tools/index.ts');

    const expectedTools = [
      'capture_knowledge_tool',
      'get_knowledge_tool',
      'list_knowledge_tool',
      'update_knowledge_tool',
      'delete_knowledge_tool',
      'semantic_search_tool',
      'generate_embeddings_tool',
      'tiered_retrieval_tool',
      'auto_detect_tool',
      'analyze_sentiment_tool',
      'evaluate_confidence_tool',
      'auto_capture_tool',
      'provide_feedback_tool',
      'record_feedback_tool',
    ];

    const missing = expectedTools.filter((tool) => !(tool in tools));

    if (missing.length === 0) {
      console.log('✅ All 14 expected tools present');
      testsPassed++;
    } else {
      throw new Error('Missing tools: ' + missing.join(', '));
    }
  } catch (error) {
    console.log('❌ Failed:', error);
    testsFailed++;
  }
  console.log();

  // Summary
  console.log('━'.repeat(50));
  console.log('Test Results:');
  console.log('✅ Passed:', testsPassed);
  console.log('❌ Failed:', testsFailed);
  console.log('━'.repeat(50));

  if (testsFailed === 0) {
    console.log('\n🎉 All smoke tests passed!');
    console.log('\n✅ MCP server is ready for Claude Code integration.');
    console.log('\nNext steps:');
    console.log('1. Copy mcp.config.example.json to your Claude Code config');
    console.log('2. Update paths in the config file');
    console.log('3. Restart Claude Code');
    console.log('4. Test tools in a Claude Code conversation');
  } else {
    console.log('\n⚠️  Some tests failed.');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
