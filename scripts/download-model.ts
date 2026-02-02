#!/usr/bin/env bun
/**
 * Pre-download the embedding model
 *
 * This script downloads and caches the Xenova/all-MiniLM-L6-v2 model
 * to speed up the first embedding generation. Run this during deployment
 * or build process.
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.allowRemoteModels = true;

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

async function downloadModel() {
  console.log(`📥 Downloading model: ${MODEL_NAME}`);
  console.log('This may take a few minutes on first run...');

  const startTime = Date.now();

  try {
    const model = await pipeline('feature-extraction', MODEL_NAME, {
      quantized: true,
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          const percent = progress.progress ? (progress.progress * 100).toFixed(1) : '0.0';
          process.stdout.write(`\r[Downloading] ${percent}%`);
        } else if (progress.status === 'loading') {
          console.log('\n[Loading] Model into memory...');
        }
      },
    });

    const elapsed = Date.now() - startTime;
    console.log(`\n✅ Model downloaded and loaded successfully in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`📊 Model: ${MODEL_NAME}`);
    console.log(`📦 Quantized: Yes`);
    console.log(`💾 Cached for future use`);

    // Test the model
    console.log('\n🧪 Testing model...');
    const testStart = Date.now();
    const output = await model('test input', { pooling: 'mean', normalize: true });
    const testElapsed = Date.now() - testStart;

    const vector = Array.from(output.data);
    console.log(`✅ Test successful! Generated ${vector.length}-dimensional vector in ${testElapsed}ms`);
    console.log('\n✨ Model is ready for use!');

  } catch (error) {
    console.error('\n❌ Failed to download model:', error);
    process.exit(1);
  }
}

// Run the download
downloadModel().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
