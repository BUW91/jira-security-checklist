import Resolver from '@forge/resolver';
import owaspList from '../default-lists/owasp';
import api, { route, storage, fetch } from '@forge/api';


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
  if (Array.isArray(list)) {
    return list
  }
  else {
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

  try {
    const response = await fetch('https://jira-security-checklist-ai-connector.vercel.app/generate-security-checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: summary,
        description: description
      })
    })
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data
      } else {
        return { success: false, body: data }
      }
    } else {
      return { success: false, status: response.status, statusText: response.statusText }
    }
  }
  catch (e) {
    return { success: false, error: e }
  }
})

export const handler = resolver.getDefinitions();
