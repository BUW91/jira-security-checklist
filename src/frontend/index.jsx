import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Select, Label, DynamicTable, Button, Inline, Strong, Box, Icon, useProductContext, LoadingButton, Textfield } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const [lists, setLists] = useState([]);
  const [listInUse, setlistInUse] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState();


  useEffect(() => {
    if (!context || !context.extension) return;

    const fetchData = async () => {
      const availableLists = await invoke('getTemplateLists');
      setLists(availableLists);

      let activeList = await invoke('getActiveList', { issueId: context.extension.issue.id });
      if (activeList) {
        setlistInUse(activeList);
      } else {
        const defaultList = availableLists.find(l => l.default === true);
        const toSetSelected = defaultList
          ? defaultList
          : availableLists.find(list => list.isDefault) || {};
        if (toSetSelected.items && !toSetSelected.items[0].id) {
          toSetSelected.items = toSetSelected.items.map(item => ({
            ...item,
          }));
        }
        setlistInUse(toSetSelected.items);
        setSelectedTemplate({label: toSetSelected.name, value: toSetSelected.id})
      }
    };

    fetchData();
  }, [context]);

  useEffect(() => {
    if (!context) {
      return
    }
    invoke('updateList', { issueId: context.extension.issue.id, list: listInUse });
  }, [listInUse]);

  function selectTemplateAction(e) {
    const selectedKey = e.value;

    const selectedList = lists.find(list => list.id === selectedKey);
    if (selectedList) {
      setlistInUse(selectedList.items);
      setSelectedTemplate({label: selectedList.name, value: selectedList.id})
    }
  }

  async function handleActionSelect(index, selectedOption) {
    const action = selectedOption.value;
    const updatedList = [...listInUse];
    updatedList[index].action = action;
    setlistInUse(updatedList);
  }

  async function handleDelete(index) {
    const updatedList = listInUse.filter((_, i) => i !== index);
    setlistInUse(updatedList);
  }

  async function handleRankEnd({ sourceIndex, destination }) {
    if (destination) {
      const updatedList = [...listInUse];
      const [movedItem] = updatedList.splice(sourceIndex, 1);
      updatedList.splice(destination.index, 0, movedItem);
      setlistInUse(updatedList);
    }
  }

  async function handleGenerateClick(e) {
    setAiLoading(true)
    const generatedList = await invoke('getGeneratedList', { issueKey: context.extension.issue.key })
    setAiLoading(false)
    if (!Array.isArray(generatedList)) {
      console.error('The generated list was not an array', generatedList)
      return
    }
    setlistInUse(generatedList)
  }

  const handleAddItem = () => {
    let newList;
    setlistInUse(prevListInUse => {
      const newItem = { label: 'New Item' };
  
      newList = [...prevListInUse, newItem];
      invoke('updateList', { issueId: context.extension.issue.id, list: newList });
  
      return newList;
    });
  
    const newIndex = newList.length - 1; // New item is at the last index
    handleEdit(newIndex, '');
  };
  

  const handleSaveItemEdit = (itemIndex, newValue) => {
    setlistInUse(prevListInUse => {
      const newList = [...prevListInUse];
      newList[itemIndex] = {
        ...newList[itemIndex],
        label: newValue,
      };
  
      // Persist the updated list to the backend
      invoke('updateList', { issueId: context.extension.issue.id, list: newList });
  
      return newList;
    });
  
    // Clear the editing state
    setEditingItem(null);
  };
  
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };
  
  


  const actionOptions = [
    { label: 'Checked', value: 'checked' },
    { label: 'Needs review', value: 'needs-review' },
    { label: 'N/A', value: 'not-applicable' }
  ];

  const handleEdit = (itemIndex, currentValue) => {
    setEditingItem(itemIndex);
    setEditValue(currentValue)
  };

  const tableRows = context && listInUse ? listInUse.map((item, index) => ({
    key: 'item-row'+index,
    cells: [
      {
        content: editingItem === index ? (
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
              onClick={() => handleSaveItemEdit(index, editValue)}
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
          <Select
            id={`action-select-${index}`}
            name="Select action"
            appearance="subtle"
            options={actionOptions}
            value={actionOptions.find(option => option.value === item.action)}
            onChange={(selectedOption) => handleActionSelect(index, selectedOption)}
          />
        ),
      },
      {
        content: (
          <Inline>
            <Button
              appearance='subtle'
              iconBefore="edit"
              onClick={() => handleEdit(index, item.label)}
            />
            <Button
              appearance='subtle'
              iconBefore="cross-circle"
              onClick={() => handleDelete(index)}
            />
          </Inline>
        ),
      },
    ],
  })) : [];

  const tableColumns = {
    cells: [
      {
        key: 'item',
        content: 'Item',
        isSortable: true,
      },
      {
        key: 'action',
        content: 'action',
        isSortable: true,
        width: 15
      },
      {
        key: 'edit-delete',
        content: '',
        width: 10
      },
    ],
  };

  return (
    <>
      <Inline spread='space-between'>
        <Inline alignBlock='center'>
          <Label labelFor="select-template-list">Select template:</Label>
          <Select
            id="select-template-list"
            value={selectedTemplate}
            name="Select template list"
            appearance="subtle"
            options={(lists.map(list => ({
              label: list.name,
              value: list.id,
            })) || [])}
            onChange={selectTemplateAction}
          />
        </Inline>
        <Inline alignBlock='center'>
          <LoadingButton appearance="primary" onClick={handleGenerateClick} isLoading={aiLoading}>Generate List (AI)</LoadingButton>
        </Inline>
      </Inline>

      <DynamicTable
        head={tableColumns}
        rows={tableRows}
        rowsPerPage={20}
        emptyView="Select a template or generate items"
        isRankable
        onRankEnd={handleRankEnd}
      />
      <Inline
        alignBlock='center'
        alignInline='center'
      >
        <Button
          appearance='subtle'
          iconBefore="add"
          onClick={() => {
            handleAddItem();
          }}
        >Add new item</Button>
      </Inline>
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
