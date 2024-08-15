import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Box, Heading, DynamicTable, Button, Toggle, Label, Textfield, Inline } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [templateLists, setTemplateLists] = useState([]);
  const [editingItem, setEditingItem] = useState({ listId: null, itemIndex: null });
  const [editValue, setEditValue] = useState('');
  const [newItemListId, setNewItemListId] = useState(null); // Track the list ID where a new item was added

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const result = await invoke('getTemplateLists');
        console.log(result);
        setTemplateLists(result);
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchTemplates();
  }, []);

  useEffect(() => {
    if (newItemListId) {
      const list = templateLists.find(list => list.id === newItemListId);
      if (list) {
        const newIndex = list.items.length - 1; // New item is at the last index
        handleEditItem(newItemListId, newIndex, '');
      }
      setNewItemListId(null); // Reset after handling
    }
  }, [templateLists, newItemListId]);

  const columns = {
    cells: [
      {
        key: "item",
        content: "Item",
      },
      {
        key: "actions",
        content: "Actions",
        width: 10
      }
    ]
  };

  const formatRows = (list) => {
    const rows = list.items.map((item, index) => ({
      key: 'item' + index,
      cells: [
        {
          content: editingItem.listId === list.id && editingItem.itemIndex === index ? (
            <Box key='edit-box'>
              <Textfield
                autoFocus
                key='item-edit'
                id='item-edit'
                defaultValue={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <Button
                key='save-edit'
                appearance="primary"
                onClick={() => handleSaveItemEdit(list.id, index, editValue)}
              >
                Save
              </Button>
              <Button
                key='cancel-edit'
                appearance="subtle"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            item.label
          )
        },
        {
          content: (
            <Inline>
              <Button
                appearance='subtle'
                iconBefore="edit"
                onClick={() => handleEditItem(list.id, index, item.label)}
              />
              <Button
                appearance='subtle'
                iconBefore="cross-circle"
                onClick={() => handleDeleteItem(list, index)}
              />
            </Inline>
          ),
        }
      ],
    }));

    return rows;
  };

  const handleEditItem = (listId, itemIndex, currentValue) => {
    setEditingItem({ listId, itemIndex });
    setEditValue(currentValue)
  };

  const handleSaveItemEdit = (listId, itemIndex, newValue) => {
    setTemplateLists(prevTemplateLists => {
      const listIndex = prevTemplateLists.findIndex(l => l.id === listId);
      if (listIndex === -1) return prevTemplateLists;

      const newTemplateLists = [...prevTemplateLists];
      const newItems = [...newTemplateLists[listIndex].items];
      newItems[itemIndex].label = newValue;

      newTemplateLists[listIndex] = { ...newTemplateLists[listIndex], items: newItems };

      // Persist the updated list to the backend
      invoke('updateTemplateList', { templateList: newTemplateLists[listIndex] });

      return newTemplateLists;
    });

    // Clear the editing state
    setEditingItem({ listId: null, itemIndex: null });
  };

  const handleCancelEdit = () => {
    setEditingItem({ listId: null, itemIndex: null });
  };

  const handleAddItem = (listId) => {
    setTemplateLists(prevTemplateLists => {
      const listIndex = prevTemplateLists.findIndex(list => list.id === listId);
      if (listIndex === -1) return prevTemplateLists;

      const newTemplateLists = [...prevTemplateLists];
      const newItems = [...newTemplateLists[listIndex].items, { label: 'New Item' }];

      newTemplateLists[listIndex] = { ...newTemplateLists[listIndex], items: newItems };

      invoke('updateTemplateList', { templateList: newTemplateLists[listIndex] });

      return newTemplateLists;
    });

    setNewItemListId(listId); // Track the list ID for the new item
  };

  const handleDeleteItem = (list, index) => {
    setTemplateLists(prevTemplateLists => {
      const listIndex = prevTemplateLists.findIndex(l => l.id === list.id);
      if (listIndex === -1) return prevTemplateLists;

      const newTemplateLists = [...prevTemplateLists];
      const newItems = [...newTemplateLists[listIndex].items];
      newItems.splice(index, 1);

      newTemplateLists[listIndex] = { ...newTemplateLists[listIndex], items: newItems };

      // Persist the updated list to the backend
      invoke('updateTemplateList', { templateList: newTemplateLists[listIndex] });

      return newTemplateLists;
    });
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await invoke('setDefaultTemplateList', { newDefaultId: id });

      if (res.success) {
        setTemplateLists(prevTemplateLists =>
          prevTemplateLists.map(list =>
            list.id === id
              ? { ...list, isDefault: true }
              : { ...list, isDefault: false }
          )
        );
      } else {
        throw new Error('Setting default was not successful');
      }
    } catch (error) {
      console.error('Error setting default template:', error);
    }
  };

  const handleEnabledToggle = async (list) => {
    console.log(list);
    // Implement toggle functionality as needed
  };

  const handleDeleteTemplate = async (id) => {
    const res = await invoke('deleteTemplateList', { id: id });
    setTemplateLists(prevTemplateLists => prevTemplateLists.filter(list => list.id !== id));
    if (!res.success) {
      throw new Error('Deletion was not successful');
    }
  };

  const handleRankEnd = (startIndex, endIndex, listId) => {
    console.log(`START INDEX: ${startIndex}`)
    console.log(`END INDEX: ${endIndex}`)

    if (startIndex === endIndex) {
      return;
    }

    setTemplateLists(prevTemplateLists => {
      const newTemplateLists = [...prevTemplateLists];
      const listIndex = newTemplateLists.findIndex(list => list.id === listId);
      if (listIndex === -1) return prevTemplateLists;

      const list = newTemplateLists[listIndex];
      const items = [...list.items];

      const [movedItem] = items.splice(startIndex, 1);
      items.splice(endIndex, 0, movedItem);

      newTemplateLists[listIndex] = { ...list, items };

      // Persist the updated list in the backend
      invoke('updateTemplateList', { templateList: newTemplateLists[listIndex] });

      return newTemplateLists;
    });
  };

  return (
    <Box>
      {templateLists.map((list, index) => (
        <Box key={index}>
          <Heading as="h3">{list.name}{list.isDefault ? '(Default)' : ''} </Heading>
          <Button appearance='subtle' onClick={() => handleSetDefault(list.id)}>Set Default</Button>
          <Button appearance='danger' onClick={() => handleDeleteTemplate(list.id)}>Delete</Button>
          <Label labelFor={`list-toggle-enabled-${index}`}>Enabled</Label>
          <Toggle
            id={`list-toggle-enabled-${index}`}
            isChecked={list.isEnabled ? true : false}
            onChange={() => handleEnabledToggle(list)}
          />
          <DynamicTable
            head={columns}
            rows={formatRows(list)}
            isRankable
            onRankEnd={({ sourceIndex, destination }) => handleRankEnd(sourceIndex, destination.index, list.id)}
          ></DynamicTable>
          <Inline
            alignBlock='center'
            alignInline='center'
          >
            <Button
              appearance='subtle'
              iconBefore="add"
              onClick={() => {
                handleAddItem(list.id);
              }}
            >Add new item</Button>
          </Inline>
        </Box>
      ))}
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
