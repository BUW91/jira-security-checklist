import Resolver from '@forge/resolver';
import owaspList from '../default-lists/owasp';

const resolver = new Resolver();

resolver.define('getLists', (req) => {
  return [owaspList];
});

resolver.define('getActiveList', (req) => {
  // Get the active list for req.ticket_id from storage
  // Example: return storage.get(req.ticket_id);
  return false;
});

resolver.define('updateItem', async (req) => {
  const { itemId, action } = req.payload;
  // Update the item with itemId in storage with the new action
  // Example: await storage.update(req.ticket_id, { itemId, action });
});

resolver.define('deleteItem', async (req) => {
  const { itemId  } = req.payload;
  // Remove the item with itemId from the storage
  // Example: await storage.delete(req.ticket_id, itemId);
});

resolver.define('updateListOrder', async (req) => {
  const { newList } = req.payload;
  // Update the order of items in storage based on the newList array (array of item IDs)
  // Example: await storage.update(req.ticket_id, { order: newList });
});

export const handler = resolver.getDefinitions();
