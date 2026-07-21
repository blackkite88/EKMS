// The domain-expert benchmark question set. Each case runs a question AS a
// specific plant role and asserts on answer quality AND access-correctness.
// These map to the challenge's "Evaluation Focus" — expert benchmark questions
// spanning maintenance history, root-cause analysis, compliance, and
// cross-functional discovery.
export const EVAL_CASES = [
  {
    id: 'Q1-rca-p101',
    question: 'Why did pump P-101 fail?',
    user: 'reliability@bpi.com',
    expect: {
      access: 'full',
      keyFacts: ['bearing', 'seizure', 'seal replacement', 'alignment', 'SOP-SEAL-REPL', 'vibration'],
      mustCite: true,
    },
  },
  {
    id: 'Q2-rca-systemic-root-cause',
    question: 'What is the systemic root cause of the P-101 bearing failure?',
    user: 'reliability@bpi.com',
    expect: {
      access: 'full',
      keyFacts: ['SOP', 'alignment', 'procedure', 'missing', 'manual'],
      mustCite: true,
    },
  },
  {
    id: 'Q3-cross-functional-pattern',
    question: 'Has a failure like the P-101 bearing seizure happened before on similar equipment?',
    user: 'reliability@bpi.com',
    expect: {
      access: 'full',
      keyFacts: ['P-102', '2023', 'similar', 'bearing'],
      mustCite: true,
    },
  },
  {
    id: 'Q4-maintenance-history',
    question: 'What is the maintenance and inspection history of pump P-101?',
    user: 'technician@bpi.com',
    expect: {
      access: 'full',
      keyFacts: ['WO-2041', 'seal', 'INS-311', 'vibration'],
      mustCite: true,
    },
  },
  {
    id: 'Q5-compliance-gaps',
    question: 'What compliance gaps exist across the plant?',
    user: 'reliability@bpi.com',
    expect: {
      access: 'full',
      keyFacts: ['overdue', 'OISD', 'vibration'],
    },
  },
  {
    id: 'Q6-factual-manual',
    question: 'What does the KSB pump manual require after a mechanical seal replacement?',
    user: 'technician@bpi.com',
    expect: {
      access: 'full',
      keyFacts: ['alignment', 'verify', 'shaft'],
      mustCite: true,
    },
  },
  {
    id: 'Q7-action-work-order',
    question: 'Create a work order to update the seal replacement SOP with an alignment check.',
    user: 'technician@bpi.com',
    expect: {
      access: 'full',
      toolExpected: 'create_work_order',
    },
  },
  {
    id: 'Q8-action-denied-operator',
    question: 'Create a work order for pump P-101.',
    user: 'operator@bpi.com',
    expect: {
      access: 'denied', // operator lacks permission to create work orders
      permissionDenied: true,
    },
  },
  {
    id: 'Q9-greeting',
    question: 'hi',
    user: 'operator@bpi.com',
    expect: {
      access: 'conversation', // should reply conversationally, no search
    },
  },
];
