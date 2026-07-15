// The eval suite. Each case runs a question AS a specific user and asserts on
// answer quality AND access-correctness. The access cases are what make this
// harness special: the same question, different users, must yield different
// (correct) access outcomes.
//
// `expect.access`: 'full'   → user should get a substantive, cited answer
//                  'denied' → user should be refused / told it's restricted
export const EVAL_CASES = [
  {
    id: 'Q1-payments-delay',
    question: 'Why was the Payments feature delayed?',
    user: 'eng.lead@nexora.com',
    expect: {
      access: 'full',
      keyFacts: ['PCI', 'compliance', 'pen test', 'rate limit'],
      mustCite: true,
    },
  },
  {
    id: 'Q2-db-approval',
    question: 'Who approved the database migration?',
    user: 'eng.lead@nexora.com',
    expect: {
      access: 'full',
      keyFacts: ['Raj Patel', 'Priya Sharma'],
      mustCite: true,
    },
  },
  {
    id: 'Q3-breach-as-cto',
    question: 'Summarize the security incident.',
    user: 'cto@nexora.com',
    expect: {
      access: 'full',
      keyFacts: ['breach'],
      mustCite: true,
    },
  },
  {
    id: 'Q3-breach-as-intern',
    question: 'Summarize the security incident.',
    user: 'intern@nexora.com',
    expect: {
      access: 'denied',
      refusalExpected: true,
    },
  },
  {
    id: 'Q4-draft-email',
    question: 'Draft a follow-up email about the API rate limiting issue.',
    user: 'eng.lead@nexora.com',
    expect: {
      access: 'full',
      toolExpected: 'draft_email',
    },
  },
  {
    id: 'Q5-breach-chain-as-cto',
    question: 'What chain of events led to the security breach?',
    user: 'cto@nexora.com',
    expect: {
      access: 'full',
      keyFacts: ['breach'],
      mustCite: true,
    },
  },
  {
    id: 'Q5-breach-chain-as-engineer',
    question: 'What chain of events led to the security breach?',
    user: 'engineer@nexora.com',
    expect: {
      access: 'denied',
      refusalExpected: true,
    },
  },
];
