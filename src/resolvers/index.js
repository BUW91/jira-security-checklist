import Resolver from '@forge/resolver';
import owaspList from '../default-lists/owasp';
import api, { route, storage } from '@forge/api';


const resolver = new Resolver();

resolver.define('getLists', (req) => {
  return [owaspList];
});

resolver.define('getActiveList', async (req) => {
  const { issueId } = req.payload
  if (!issueId) {
    return false;
  }
  const list = await storage.get(issueId)
  if (Array.isArray(list)){
    return list
  }
  else{
    return false
  }
});
resolver.define('updateList', async (req) => {
  const { issueId, list } = req.payload
  await storage.set(issueId, list)
  return { success: true };
});

resolver.define('getGeneratedList', async (req) => {
  const { issueKey } = req.payload
  const res = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`)
  const issueData = await res.json();
  const summary = issueData.fields.summary
  const description = issueData.fields.description
  return [{ label: '', issueData }]
})

export const handler = resolver.getDefinitions();
