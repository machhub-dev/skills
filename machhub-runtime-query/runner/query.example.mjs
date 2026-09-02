// query.example.mjs — copyable template. The agent copies this to `_scratch.mjs`,
// edits the body, then runs:  node .claude/skills/machhub-runtime-query/runner/_scratch.mjs
//
// Whatever you `return` is printed to stdout as JSON. `sdk` is READ-ONLY.

import { run } from './mch.mjs';

run(async (sdk) => {
  const collection = 'items';

  // 1) Inspect the ACTUAL distinct values stored — never trust enum casing blindly.
  //    (e.g. the schema says itemStatus enum is lowercase, but legacy rows may store "Active".)
  const sample = await sdk.collection(collection).limit(1000).getAll({ fields: ['itemStatus'] });
  const distinctStatuses = [...new Set(sample.map((r) => r.itemStatus))];

  // 2) Count per real value (server-side count is cheap and exact).
  const counts = {};
  for (const v of distinctStatuses) {
    counts[v] = await sdk.collection(collection).filter('itemStatus', '=', v).count();
  }

  // 3) Return a structured answer.
  return { collection, distinctStatuses, counts };
});
