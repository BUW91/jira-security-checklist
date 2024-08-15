import Resolver from '@forge/resolver';
import owaspList from '../default-lists/owasp';
import api, { route, storage, fetch, startsWith } from '@forge/api';
import uuid from 'uuid-random';


const resolver = new Resolver();

const getTemplateRef = (id) => {
  return `list-${id}`
}

resolver.define('getTemplateLists', async () => {
  const result = await storage.query().where('key', startsWith('list-')).getMany()
  const templateKeyValues = result.results
  if (templateKeyValues.length < 1) {
    owaspList.id = uuid()
    owaspList.isDefault = true
    owaspList.isEnabled = true
    storage.set(getTemplateRef(owaspList.id), owaspList)
    return [owaspList]
  }
  else {
    let resultsToReturn = []
    templateKeyValues.forEach(templateKeyValue => {
      resultsToReturn.push(templateKeyValue.value)
    });
    return resultsToReturn
  }

});

resolver.define('updateTemplateList', async (req) => {
  const { templateList } = req.payload
  await storage.set(getTemplateRef(templateList.id), templateList)
})

resolver.define('setDefaultTemplateList', async (req) => {
  const { newDefaultId } = req.payload
  const templates = await storage.query().where('key', startsWith('list-')).getMany()
  await Promise.all(templates.map(async (template) => {
    const templateData = template.value;

    if (templateData.id === newDefaultId) {
      templateData.isDefault = true;
    } else {
      templateData.isDefault = false;
    }

    await storage.set(getTemplateRef(templateData.id), templateData);
  }));
})

resolver.define('deleteTemplateList', async (req) => {
  const { id } = req.payload
  try {
    const res = await storage.delete(getTemplateRef(id))
    return { success: true, message: res}
  }
  catch(e){
    return {success: false, message: `error while deleting ${templateId}`, error: e}
  }

})

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
    const response = await fetch('https://sc.api.solidini.com/generate-security-checklist', {
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
