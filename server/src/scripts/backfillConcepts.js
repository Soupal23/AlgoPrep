import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { ensureTestTagged } from '../services/conceptTaggingService.js';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const topicArg = process.argv.find((a) => a.startsWith('--topic='));
  const topicFilter = topicArg ? topicArg.split('=')[1] : null;

  console.log('=== AlgoPrep Concept Backfill Utility ===');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE (Applying tags)'}`);
  if (topicFilter) console.log(`Topic Filter: "${topicFilter}"`);

  await connectDB();

  try {
    const testFilter = {};
    if (topicFilter) {
      testFilter.topic = topicFilter;
    }

    const tests = await Test.find(testFilter);
    console.log(`Found ${tests.length} tests to inspect.`);

    let taggedCount = 0;
    let skippedCount = 0;

    for (const test of tests) {
      const untaggedCount = await Question.countDocuments({
        testId: test._id,
        $or: [{ concept: null }, { difficulty: null }]
      });

      if (untaggedCount === 0) {
        skippedCount++;
        continue;
      }

      console.log(`\nProcessing Test: "${test.title}" (${test.topic}) — ${untaggedCount} untagged questions...`);

      if (isDryRun) {
        console.log(`[DRY-RUN] Would call ensureTestTagged for test ID ${test._id}`);
        taggedCount++;
      } else {
        const result = await ensureTestTagged(test._id);
        console.log(`Result for "${test.title}":`, result);
        if (result.tagged) {
          taggedCount++;
        }
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Total Tests Inspected: ${tests.length}`);
    console.log(`Tests Tagged/Updated: ${taggedCount}`);
    console.log(`Tests Already Fully Tagged: ${skippedCount}`);
    console.log('Completed successfully.');
  } catch (err) {
    console.error('Backfill script error:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

main();
