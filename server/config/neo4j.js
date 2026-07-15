// Neo4j driver singleton + session factory. The driver is a heavyweight,
// long-lived object; sessions are cheap and short-lived (one per unit of work).
import neo4j from 'neo4j-driver';
import { env } from './env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('neo4j');

let driver = null;

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      env.neo4jUri,
      neo4j.auth.basic(env.neo4jUser, env.neo4jPassword),
      { maxConnectionPoolSize: 50, connectionTimeout: 10000 }
    );
  }
  return driver;
}

export function getSession() {
  return getDriver().session();
}

// Run a single query in a managed read session and return records mapped by fn.
export async function readQuery(cypher, params = {}, mapFn = (r) => r) {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(cypher, params);
    return result.records.map(mapFn);
  } finally {
    await session.close();
  }
}

// Run a single write query in a managed write session.
export async function writeQuery(cypher, params = {}) {
  const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

export async function pingNeo4j() {
  await getDriver().verifyConnectivity();
  return true;
}

export async function closeNeo4j() {
  if (driver) {
    await driver.close();
    driver = null;
    log.info('Neo4j driver closed');
  }
}

export { neo4j };
