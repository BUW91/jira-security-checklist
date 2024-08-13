import Resolver from '@forge/resolver';
import owaspList from '../default-lists/owasp';

const resolver = new Resolver();

resolver.define('getLists', (req) => {
  return [owaspList];
});

resolver.define('getActiveList', (req) => {
  // get from storage the active list for req.ticket_id?
  return false;
});

export const handler = resolver.getDefinitions();
