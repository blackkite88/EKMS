// Renders eval results (structural metrics + query benchmark) to a console
// summary and a markdown report — the numbers that map to the challenge's
// Evaluation Focus.
function checkMark(pass) {
  return pass ? '✓' : '✗';
}

function metricsBlock(metrics) {
  if (!metrics) return [];
  const m = metrics;
  return [
    ['Entity extraction accuracy', `${m.entity.accuracy}% (${m.entity.correct}/${m.entity.checked} equipment refs across doc types)`],
    ['Entity types extracted', `${m.entity.entityTypeCount} (${m.entity.entityTypes.join(', ')})`],
    ['Graph linkage completeness', `${m.linkage.connectedPct}% connected (${m.linkage.orphans} orphans / ${m.linkage.nodes} nodes)`],
    ['Graph density', `${m.linkage.density} edges/node, ${m.linkage.edges} edges, ${m.linkage.crossTypePct}% cross-document-type`],
    ['Compliance gaps detected', `${m.compliance.gapsDetected} (${m.compliance.overdue} overdue)`],
    ['Avg time-to-answer', `${(m.avgLatencyMs / 1000).toFixed(1)}s`],
  ];
}

export function renderConsole(results, metrics) {
  console.log('\n════════════ ASSETBRAIN — EVAL REPORT ════════════\n');

  if (metrics) {
    console.log('STRUCTURAL METRICS');
    for (const [k, v] of metricsBlock(metrics)) console.log(`  ${k.padEnd(30)} ${v}`);
    console.log('');
  }

  console.log('QUERY BENCHMARK');
  for (const r of results) {
    const c = r.checks;
    const parts = [];
    if (c.access) parts.push(`access ${checkMark(c.access.pass)} (${c.access.detail})`);
    if (c.citation) parts.push(`citation ${checkMark(c.citation.pass)}`);
    if (c.tool) parts.push(`tool ${checkMark(c.tool.pass)}`);
    if (c.correctness && c.correctness.score !== null) parts.push(`correctness ${c.correctness.score}/10`);
    console.log(`  ${r.pass ? '✅' : '❌'} ${r.id.padEnd(30)} ${parts.join('  ·  ')}`);
  }

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const accessCases = results.filter((r) => r.checks.access);
  const accessPass = accessCases.filter((r) => r.checks.access.pass).length;
  const accessPct = accessCases.length ? Math.round((accessPass / accessCases.length) * 100) : 100;
  const scored = results.filter((r) => r.checks.correctness && r.checks.correctness.score !== null);
  const avgQuality = scored.length ? (scored.reduce((a, r) => a + r.checks.correctness.score, 0) / scored.length).toFixed(1) : 'n/a';

  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(`Query benchmark: ${passed}/${total} passed`);
  console.log(`Avg answer quality: ${avgQuality}/10`);
  console.log(`Access-control compliance: ${accessPct}% (${accessPass}/${accessCases.length})`);
  console.log('──────────────────────────────────────────────────────────────\n');

  return { total, passed, accessPct, avgQuality };
}

export function renderMarkdown(results, summary, metrics) {
  const lines = [];
  lines.push('# AssetBrain — Evaluation Report\n');
  lines.push(`Generated: ${new Date().toISOString()}\n`);

  if (metrics) {
    lines.push('## Structural Metrics\n');
    lines.push('| Metric | Result |');
    lines.push('|--------|--------|');
    for (const [k, v] of metricsBlock(metrics)) lines.push(`| ${k} | ${v} |`);
    lines.push('');
  }

  lines.push('## Query Benchmark\n');
  lines.push('| Case | Access | Citation | Tool | Correctness | Pass |');
  lines.push('|------|--------|----------|------|-------------|------|');
  for (const r of results) {
    const c = r.checks;
    lines.push(
      `| ${r.id} | ${c.access ? checkMark(c.access.pass) : '—'} | ${c.citation ? checkMark(c.citation.pass) : '—'} | ${
        c.tool ? checkMark(c.tool.pass) : '—'
      } | ${c.correctness && c.correctness.score !== null ? `${c.correctness.score}/10` : '—'} | ${r.pass ? '✅' : '❌'} |`,
    );
  }
  lines.push('');
  lines.push(`**Query benchmark:** ${summary.passed}/${summary.total} passed`);
  lines.push(`**Avg answer quality:** ${summary.avgQuality}/10`);
  lines.push(`**Access-control compliance:** ${summary.accessPct}%`);
  return lines.join('\n');
}
