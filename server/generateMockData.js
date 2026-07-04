import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');

const DIRECTORIES = {
    emails: path.join(DATA_DIR, 'emails'),
    meetings: path.join(DATA_DIR, 'meetings'),
    tickets: path.join(DATA_DIR, 'tickets'),
    docs: path.join(DATA_DIR, 'docs'),
    github: path.join(DATA_DIR, 'github')
};

// Create directories
Object.values(DIRECTORIES).forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
});

// Helper functions
const writeJson = (dir, filename, data) => fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
const writeTxt = (dir, filename, data) => fs.writeFileSync(path.join(dir, filename), data);
const writeMd = (dir, filename, data) => fs.writeFileSync(path.join(dir, filename), data);

console.log('Generating Mock Data for Nexora Inc...');

// --- 1. DOCS (10 Markdown files) ---
const docs = [
    {
        name: 'architecture.md',
        content: `# Nexora Architecture\nThe core system uses a microservices architecture. We are currently blocked on the API rate limiting issue described in PR #405.\n\nThe database migration strategy is approved by Sarah Jenkins (CTO) as discussed in meeting standup_03.`
    },
    {
        name: 'payments-api.md',
        content: `# Payments API\nOur new Payments feature is integrated with Stripe. Unfortunately, it was delayed due to the API rate limiting issue (see ticket_11 and email_04).`
    },
    {
        name: 'database-migration.md',
        content: `# Database Migration Plan\nWe are migrating from PostgreSQL 12 to 15. The approval was finalized by Sarah Jenkins. Reference: email_09.`
    },
    { name: 'onboarding.md', content: `# Onboarding\nWelcome to Nexora! Please ensure you join the weekly engineering standups.` },
    { name: 'frontend-guidelines.md', content: `# Frontend Guidelines\nUse React and Tailwind.` },
    { name: 'backend-guidelines.md', content: `# Backend Guidelines\nUse Node.js and Express.` },
    { name: 'security-policy.md', content: `# Security Policy\nAll API endpoints must be authenticated.` },
    { name: 'release-process.md', content: `# Release Process\nReleases happen every Tuesday.` },
    { name: 'api-documentation.md', content: `# API Documentation\nBase URL is https://api.nexora.com.` },
    { name: 'team-structure.md', content: `# Team Structure\nNexora has 80 employees.` }
];
docs.forEach(doc => writeMd(DIRECTORIES.docs, doc.name, doc.content));

// --- 2. EMAILS (12 JSON files) ---
const emails = [
    {
        id: 'email_04',
        subject: 'Payments Feature Delayed',
        sender: 'alice@nexora.com',
        recipient: 'eng-team@nexora.com',
        body: 'Team, the Payments feature is delayed. We are waiting on a fix for the API rate limiting issue. See ticket_11 for details. Also mentioned in meeting standup_03.'
    },
    {
        id: 'email_09',
        subject: 'Database Migration Approval',
        sender: 'sarah.jenkins@nexora.com',
        recipient: 'infra@nexora.com',
        body: 'I am officially approving the database migration plan (see database-migration.md). Please proceed.'
    },
    {
        id: 'email_01', subject: 'Welcome', sender: 'hr@nexora.com', recipient: 'all@nexora.com', body: 'Welcome to the team!'
    },
    { id: 'email_02', subject: 'Lunch', sender: 'bob@nexora.com', recipient: 'alice@nexora.com', body: 'Lunch at 12?' },
    { id: 'email_03', subject: 'Server down', sender: 'alerts@nexora.com', recipient: 'infra@nexora.com', body: 'Server is down.' },
    { id: 'email_05', subject: 'Weekly update', sender: 'ceo@nexora.com', recipient: 'all@nexora.com', body: 'Great week everyone.' },
    { id: 'email_06', subject: 'Q3 Goals', sender: 'ceo@nexora.com', recipient: 'all@nexora.com', body: 'Our Q3 goals are set.' },
    { id: 'email_07', subject: 'Design review', sender: 'design@nexora.com', recipient: 'eng-team@nexora.com', body: 'Design review at 2.' },
    { id: 'email_08', subject: 'Holiday party', sender: 'hr@nexora.com', recipient: 'all@nexora.com', body: 'Holiday party is next week.' },
    { id: 'email_10', subject: 'New Hire', sender: 'hr@nexora.com', recipient: 'all@nexora.com', body: 'Please welcome our new hire.' },
    { id: 'email_11', subject: 'Office Closed', sender: 'hr@nexora.com', recipient: 'all@nexora.com', body: 'Office closed tomorrow.' },
    { id: 'email_12', subject: 'All Hands', sender: 'ceo@nexora.com', recipient: 'all@nexora.com', body: 'All hands meeting at 10.' }
];
emails.forEach(email => writeJson(DIRECTORIES.emails, `${email.id}.json`, email));

// --- 3. MEETINGS (8 TXT files) ---
const meetings = [
    {
        id: 'standup_03',
        content: 'Engineering Standup - Last Week\nAttendees: Alice, Bob, Charlie, Sarah\nSummary: We discussed the API rate limiting issue causing the Payments feature delay (ticket_11). Charlie is working on PR 405 to fix it. Sarah Jenkins approved the database migration.'
    },
    { id: 'standup_01', content: 'Engineering Standup\nAttendees: Alice, Bob\nSummary: Normal day.' },
    { id: 'standup_02', content: 'Engineering Standup\nAttendees: Alice, Bob, Charlie\nSummary: Worked on bugs.' },
    { id: 'design_sync', content: 'Design Sync\nAttendees: Design Team\nSummary: Finalized new logo.' },
    { id: 'all_hands_01', content: 'All Hands\nAttendees: Everyone\nSummary: Company is doing well.' },
    { id: 'product_sync', content: 'Product Sync\nAttendees: Product Team\nSummary: Discussed roadmap.' },
    { id: 'infra_sync', content: 'Infra Sync\nAttendees: Infra Team\nSummary: Discussed AWS costs.' },
    { id: 'marketing_sync', content: 'Marketing Sync\nAttendees: Marketing Team\nSummary: Discussed ad campaign.' }
];
meetings.forEach(meeting => writeTxt(DIRECTORIES.meetings, `${meeting.id}.txt`, meeting.content));

// --- 4. TICKETS (15 JSON files) ---
const tickets = [
    {
        id: 'ticket_11',
        title: 'API Rate Limiting Issue',
        description: 'The API is rate limiting too aggressively, causing the Payments feature to be delayed. See PR 405 for the proposed fix. Mentioned in email_04.',
        status: 'In Progress',
        priority: 'High',
        assignee: 'Charlie'
    },
    { id: 'ticket_01', title: 'Fix typo', description: 'Typo in homepage.', status: 'Done' },
    { id: 'ticket_02', title: 'Update CSS', description: 'Update CSS for buttons.', status: 'Done' },
    { id: 'ticket_03', title: 'Add unit tests', description: 'Add unit tests for auth module.', status: 'Todo' },
    { id: 'ticket_04', title: 'Update dependencies', description: 'Update npm packages.', status: 'Todo' },
    { id: 'ticket_05', title: 'Fix login bug', description: 'Users cannot login.', status: 'Done' },
    { id: 'ticket_06', title: 'Add dark mode', description: 'Implement dark mode.', status: 'Todo' },
    { id: 'ticket_07', title: 'Optimize images', description: 'Compress images on upload.', status: 'Done' },
    { id: 'ticket_08', title: 'Create dashboard', description: 'Create analytics dashboard.', status: 'Todo' },
    { id: 'ticket_09', title: 'Update docs', description: 'Update readme.', status: 'Done' },
    { id: 'ticket_10', title: 'Setup CI/CD', description: 'Setup Github Actions.', status: 'Done' },
    { id: 'ticket_12', title: 'Fix memory leak', description: 'Memory leak in worker.', status: 'Todo' },
    { id: 'ticket_13', title: 'Add logging', description: 'Add more logs.', status: 'Done' },
    { id: 'ticket_14', title: 'Update Terms of Service', description: 'Update TOS.', status: 'Todo' },
    { id: 'ticket_15', title: 'Migrate to TS', description: 'Migrate codebase to TypeScript.', status: 'Todo' }
];
tickets.forEach(ticket => writeJson(DIRECTORIES.tickets, `${ticket.id}.json`, ticket));

// --- 5. GITHUB (8 JSON files) ---
const prs = [
    {
        id: 'PR_405',
        title: 'Fix API Rate Limiting',
        description: 'This PR fixes the API rate limiting issue that blocked the Payments feature. Fixes ticket_11. Relates to architecture.md.',
        author: 'Charlie',
        status: 'Open'
    },
    { id: 'PR_401', title: 'Initial commit', description: 'Setup project.', status: 'Merged' },
    { id: 'PR_402', title: 'Add auth', description: 'Add authentication.', status: 'Merged' },
    { id: 'PR_403', title: 'Add billing', description: 'Add billing module.', status: 'Merged' },
    { id: 'PR_404', title: 'Fix CSS', description: 'Fix CSS issues.', status: 'Merged' },
    { id: 'PR_406', title: 'Update dependencies', description: 'Update dependencies.', status: 'Open' },
    { id: 'PR_407', title: 'Add tests', description: 'Add more tests.', status: 'Merged' },
    { id: 'PR_408', title: 'Refactor core', description: 'Refactor core module.', status: 'Open' }
];
prs.forEach(pr => writeJson(DIRECTORIES.github, `${pr.id}.json`, pr));

console.log('Successfully generated 53 mock files!');
