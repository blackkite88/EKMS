// Renders eval results to a console table + a markdown report string.
function checkMark(pass) {
  return pass ? '✓' : '✗';
}

export function renderConsole(results) {
  console.log('\n════════════ NEXORA KNOWLEDGE BRAIN — EVAL REPORT ════════════\n');
  for (const r of results) {
    const c = r.checks;
    const parts = [];
    if (c.access) parts.push(`access ${checkMark(c.access.pass)} (${c.access.detail})`);
    if (c.citation) parts.push(`citation ${checkMark(c.citation.pass)}`);
    if (c.tool) parts.push(`tool ${checkMark(c.tool.pass)}`);
    if (c.correctness && c.correctness.score !== null) parts.push(`correctness ${c.correctness.score}/10`);
    console.log(`${r.pass ? '✅' : '❌'} ${r.id.padEnd(28)} ${parts.join('  ·  ')}`);
  }

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const accessCases = results.filter((r) => r.checks.access);
  const accessPass = accessCases.filter((r) => r.checks.access.pass).length;
  const accessPct = accessCases.length ? Math.round((accessPass / accessCases.length) * 100) : 100;

  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(`Overall: ${passed}/${total} cases passed`);
  console.log(`Access-control compliance: ${accessPct}% (${accessPass}/${accessCases.length})`);
  console.log('──────────────────────────────────────────────────────────────\n');

  return { total, passed, accessPct };
}

export function renderMarkdown(results, summary) {
  const lines = [];
  lines.push('# Nexora Knowledge Brain — Eval Report\n');
  lines.push(`Generated: ${new Date().toISOString()}\n`);
  lines.push('| Case | Access | Citation | Tool | Correctness | Pass |');
  lines.push('|------|--------|----------|------|-------------|------|');
  for (const r of results) {
    const c = r.checks;
    lines.push(
      `| ${r.id} | ${c.access ? checkMark(c.access.pass) : '—'} | ${
        c.citation ? checkMark(c.citation.pass) : '—'
      } | ${c.tool ? checkMark(c.tool.pass) : '—'} | ${
        c.correctness && c.correctness.score !== null ? `${c.correctness.score}/10` : '—'
      } | ${r.pass ? '✅' : '❌'} |`
    );
  }
  lines.push('');
  lines.push(`**Overall:** ${summary.passed}/${summary.total} passed`);
  lines.push(`**Access-control compliance:** ${summary.accessPct}%`);
  return lines.join('\n');
}
