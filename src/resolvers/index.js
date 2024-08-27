import Resolver from '@forge/resolver';
import owasp2021 from '../default-lists/owasp2021';
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
    owasp2021.id = uuid()
    owasp2021.isDefault = true
    owasp2021.isEnabled = true
    storage.set(getTemplateRef(owasp2021.id), owasp2021)
    return [owasp2021]
  }
  else {
    let resultsToReturn = []
    templateKeyValues.forEach(templateKeyValue => {
      resultsToReturn.push(templateKeyValue.value)
    });
    return resultsToReturn
  }

});

resolver.define('createTemplateList', async (req) => {
  const template = req.payload
  if (!template.name || !template.items || !Array.isArray(template.items)){
    return {success: false}
  }
  template.id = uuid()
  template.isDefault = template.isDefault ? template.isDefault : false
  template.isEnabled = template.hasOwnProperty('isEnabled') ? template.isEnabled : true
  storage.set(getTemplateRef(template.id), template)
  return {...template}
})

resolver.define('updateTemplateList', async (req) => {
  const { templateList } = req.payload
  const res = await storage.set(getTemplateRef(templateList.id), templateList)
  return {success: true, message: res}
})

resolver.define('deleteListItem', async (req) => {
  try{
    const { issueId, listItem} = req.payload
    let list = await storage.get(issueId)
    const listWithoutItem = list.filter(item => item.id !== listItem.id)
    await storage.set(issueId, listWithoutItem)
    return {success: true, list: listWithoutItem}
  }
  catch(e){
    return {success: false, message: e}
  }
})

resolver.define('rankListItem', async (req) => {
  try{
    let { issueId, listItem, newRank} = req.payload
    let list = await storage.get(issueId)
    const idx = list.findIndex(item => item.id === listItem.id)

    const updatedList = [...list];
    const [movedItem] = updatedList.splice(idx, 1);
    updatedList.splice(newRank, 0, movedItem);
    await storage.set(issueId, updatedList)
    return {success: true, list: updatedList}
  }
  catch(e){
    console.log(e)
    return {success: false, message: e.message}
  }
})

resolver.define('setDefaultTemplateList', async (req) => {
  const { newDefaultId } = req.payload
  const res = await storage.query().where('key', startsWith('list-')).getMany()
  const templates = res.results
  await Promise.all(templates.map(async (template) => {
    const templateData = template.value;

    if (templateData.id === newDefaultId) {
      templateData.isDefault = true;
    } else {
      templateData.isDefault = false;
    }

    await storage.set(getTemplateRef(templateData.id), templateData);
  }));
  return {success: true}
})

resolver.define('deleteTemplateList', async (req) => {
  const { id } = req.payload
  try {
    const res = await storage.delete(getTemplateRef(id))
    return { success: true, message: res }
  }
  catch (e) {
    return { success: false, message: `error while deleting ${templateId}`, error: e }
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

resolver.define('addItemToList', async (req) => {
  const { issueId, newItem } = req.payload
  if (!newItem.id){
    newItem.id = uuid()
  }

  try {
    let list = await storage.get(issueId)
    if (!list){
      list = []
    }
    list.push(newItem)
    const res = await storage.set(issueId, list)
    return { success: true, list: list }
  }
  catch (e) {
    return { success: false, message: e }
  }
});

resolver.define('updateListItem', async (req) => {
  try{
    let { issueId, listItem} = req.payload
    listItem.id ? listItem.id : uuid()
    let list = await storage.get(issueId)
    const idx = list.findIndex(item => item.id === listItem.id)
    if (idx || idx === 0){
      list[idx] = listItem
    }
    else{
      console.log('Nope not there, pushing')
      list.push(listItem)
    }
    await storage.set(issueId, list)
    return {success: true, list: list}
  }
  catch(e){
    console.log(e)
    return {success: false, message: e}
  }
})

resolver.define('getGeneratedList', async (req) => {
  const { issueId, issueKey } = req.payload
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
        const list = data.map(item => ({...item, status: 'needs-review', id: uuid()}))
        storage.set(issueId, list)
        return list
      } else {
        return { success: false, body: data }
      }
    } else {
      return { success: false, status: response.status, statusText: response.statusText }
    }
  }
  catch (e) {
    console.error(e)
    return { success: false, error: e.message }
  }
})

export const handler = resolver.getDefinitions();
