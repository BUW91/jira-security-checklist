import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Select, Label, DynamicTable, Button, Inline, Strong, Box, Icon } from '@forge/react';
import { invoke } from '@forge/bridge';
import uuid from 'uuid-random';

const App = () => {
  const [lists, setLists] = useState([]);
  const [listInUse, setlistInUse] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    async function asyncListSetter() {
      const availableLists = await invoke('getLists');
      setLists(availableLists);
      return availableLists;
    }

    async function asyncSelectedSetter(availableLists) {
      const activeList = await invoke('getActiveList');
      if (activeList) {
        setlistInUse(activeList.items);
      } else {
        const defaultList = availableLists.find(l => l.default === true);
        const toSetSelected = defaultList
          ? defaultList
          : availableLists.find(list => list.name === 'OWASP') || {};
        if (toSetSelected.items && !toSetSelected.items[0].id) {
          toSetSelected.items = toSetSelected.items.map(item => ({
            ...item,
            id: uuid(),
          }));
        }
        setlistInUse(toSetSelected.items);
      }
    }

    asyncListSetter().then(asyncSelectedSetter);
  }, []);

  useEffect(() => {
    console.log('---listInUse updated----');
    console.log(listInUse);
  }, [listInUse]);

  function selectTemplateAction(e) {
    const selectedTemplate = e.target.value;
    setSelectedTemplate(selectedTemplate);

    const selectedList = lists.find(list => list.name === selectedTemplate);
    if (selectedList) {
      setlistInUse(selectedList.items);
    }
  }

  async function handleActionSelect(index, selectedOption) {
    const action = selectedOption.key;
    const updatedList = [...listInUse];
    updatedList[index].action = action;

    setlistInUse(updatedList);
    await invoke('updateItem', { itemId: updatedList[index].id, action });
  }

  async function handleDelete(index) {
    const itemId = listInUse[index].id;
    const updatedList = listInUse.filter((_, i) => i !== index);

    setlistInUse(updatedList);
    await invoke('deleteItem', { itemId });
  }

  async function handleRankEnd({ sourceIndex, destination }) {
    if (destination) {
      const updatedList = [...listInUse];
      const [movedItem] = updatedList.splice(sourceIndex, 1);
      updatedList.splice(destination.index, 0, movedItem);

      setlistInUse(updatedList);
      await invoke('updateListOrder', { newList: updatedList.map(item => item.id) });
    }
  }

  const actionOptions = [
    { label: 'Checked', key: 'checked' },
    { label: 'Needs review', key: 'needs-review' },
    { label: 'N/A', key: 'not-applicable' }
  ];

  const tableRows = listInUse.map((item, index) => ({
    key: item.label,
    cells: [
      { content: item.label },
      {
        content: (
          <Select
            id={`action-select-${index}`}
            name="Select action"
            appearance="subtle"
            options={actionOptions}
            value={actionOptions.find(option => option.key === item.action)}
            onChange={(selectedOption) => handleActionSelect(index, selectedOption)}
          />
        ),
      },
      {
        content: <Button appearance='subtle' iconBefore="cross-circle" onClick={() => handleDelete(index)} />,
      },
    ],
  }));

  const tableColumns = {
    cells: [
      {
        key: 'item',
        content: 'Item',
        isSortable: true,
      },
      {
        key: 'action',
        content: 'Action',
        isSortable: true,
      },
      {
        key: 'delete',
        content: 'Delete',
      },
    ],
  };

  return (
    <>
      {listInUse.length < 1 && (
        <Inline alignBlock="stretch" alignInline="center">
          <Label labelFor="select-template-list">Select template:</Label>
          <Select
            id="select-template-list"
            name="Select template list"
            appearance="subtle"
            options={(lists.map(list => ({
              label: list.name,
              key: list.name,
            })) || [])}
            onChange={selectTemplateAction}
          />
          <Text><Strong>OR</Strong></Text>
          <Button appearance="primary">Generate List (AI)</Button>
        </Inline>
      )}

      <DynamicTable
        head={tableColumns}
        rows={tableRows}
        rowsPerPage={20}
        emptyView="Select a template or generate items"
        isRankable
        onRankEnd={handleRankEnd}
      />
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
