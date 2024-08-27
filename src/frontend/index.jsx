import React, { useEffect, useState, useRef } from 'react';
import ForgeReconciler, { Text, Select, Label, DynamicTable, Button, Inline, Strong, Box, Icon, useProductContext, LoadingButton, Textfield, SectionMessage, ProgressBar, Badge, Lozenge } from '@forge/react';
import { invoke, view } from '@forge/bridge';
import uuid from 'uuid-random';


const App = () => {
  const context = useProductContext();
  const [lists, setLists] = useState([]);
  const [listInUse, setlistInUse] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [startingEditValue, setStartingEditValue] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState();
  const [showLicenseError, setShowLicenseError] = useState(false);
  const editVal = useRef('')

  const completedItemsCount = listInUse.filter(item => item.status === 'reviewed').length;
  const totalItemsCount = listInUse.length;
  const progressValue = totalItemsCount > 0 ? completedItemsCount / totalItemsCount : 0;
  const progressAppearance = progressValue === 1 ? 'success' : 'default'

  useEffect(() => {
    if (!context || !context.extension) return;
    if (!context.license.active) {
      setShowLicenseError(true)
    }
    const fetchData = async () => {
      const availableLists = await invoke('getTemplateLists');
      setLists(availableLists);

      let activeList = await invoke('getActiveList', { issueId: context.extension.issue.id });
      if (activeList) {
        setlistInUse(activeList);
      } else {
        const defaultList = availableLists.find(l => l.default === true);
        let toSetSelected = defaultList
          ? defaultList
          : availableLists.find(list => list.isDefault) || {};
        if (toSetSelected.items && !toSetSelected.items[0].id) {
          toSetSelected.items = toSetSelected.items.map(item => ({
            ...item,
            status: 'needs-review',
            id: uuid()
          }));
        }
        invoke('updateList', { issueId: context.extension.issue.id, list: toSetSelected.items });
        setlistInUse(toSetSelected.items);
        setSelectedTemplate({ label: toSetSelected.name, value: toSetSelected.id })
      }
    };

    fetchData();
  }, [context]);

  // useEffect(() => {
  //   if (!context) {
  //     return
  //   }
  //   invoke('updateList', { issueId: context.extension.issue.id, list: listInUse });
  // }, [listInUse]);

  function selectTemplateAction(e) {
    const selectedKey = e.value;
    const selectedList = lists.find(list => list.id === selectedKey);
    let newList 
    if (selectedList) {
      newList = selectedList.items.map(item => ({
        ...item,
        status: 'needs-review',
        id: uuid()
      }));
      invoke('updateList', { issueId: context.extension.issue.id, list: newList });
      setlistInUse(newList);
      setSelectedTemplate({ label: selectedList.name, value: selectedList.id });
    }
  }
  

  async function handleStatusSelect(id, selectedOption) {
    const status = selectedOption.value;
    const updatedList = [...listInUse];

    const idx = listInUse.findIndex(item => item.id === id)
    const newListItem = {
      ...updatedList[idx],
      status: status
    }
    updatedList[idx] = newListItem;
    setlistInUse(updatedList);
    invoke('updateListItem', { issueId: context.extension.issue.id, listItem: newListItem })
  }

  async function handleDelete(id) {
    const listItem = listInUse.find(item => item.id === id)
    const updatedList = listInUse.filter((item) => item.id !== id);
    setlistInUse(updatedList);
    invoke('deleteListItem', { issueId: context.extension.issue.id, listItem: listItem })
  }

  async function handleRankEnd({ sourceIndex, destination }) {
    if (destination) {
      const updatedList = [...listInUse];
      const [movedItem] = updatedList.splice(sourceIndex, 1);
      updatedList.splice(destination.index, 0, movedItem);
      invoke('rankListItem', { issueId: context.extension.issue.id, listItem: movedItem, newRank: destination.index })
      setlistInUse(updatedList);
    }
  }

  async function handleGenerateClick(e) {
    setAiLoading(true)
    const generatedList = await invoke('getGeneratedList', { issueId: context.extension.issue.id, issueKey: context.extension.issue.key })
    setAiLoading(false)
    if (!Array.isArray(generatedList)) {
      console.error('The generated list was not an array', generatedList)
      return
    }
    setlistInUse(generatedList)
    setSelectedTemplate(null)
  }

  const handleAddItem = () => {
    const newItem = { label: 'New Item', id: uuid(), status: 'needs-review' };
    let newList;
    setlistInUse(prevListInUse => {
      newList = [...prevListInUse, newItem];
      return newList;
    });
    invoke('updateList', { issueId: context.extension.issue.id, list: newList });

    handleEdit(newItem.id, '');
  };


  const handleSaveItemEdit = async (id, newValue) => {
    const idx = listInUse.findIndex(item => item.id === id)
    const newListItem = {
      ...listInUse[idx],
      label: newValue,
    }
    setlistInUse(prevListInUse => {
      const newList = [...prevListInUse];
      newList[idx] = newListItem;
      return newList;
    });
    invoke('updateListItem', { issueId: context.extension.issue.id, listItem: newListItem })
    setEditingItem(null);
    setStartingEditValue('')
    editVal.current = ''
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setStartingEditValue('');
    editVal.current = ''
  };

  const statusOptions = [
    { label: 'Needs review', value: 'needs-review' },
    { label: 'Reviewed', value: 'reviewed' },
    { label: 'Action required', value: 'action-required' }
  ];

  const statusLozenge = {
    'needs-review': { appearance: "default", label: "NEEDS REVIEW" },
    'action-required': { appearance: "moved", label: "ACTION REQUIRED" },
    reviewed: {appearance: "success", label: "REVIEWED"},
  };


  const handleEdit = (itemIndex, currentValue) => {
    setEditingItem(itemIndex);
    setStartingEditValue(currentValue)
    editVal.current = currentValue
  };

  const tableRows = context && listInUse ? listInUse.map((item) => ({
    key: 'item-row' + item.id,
    cells: [
      {
        content: editingItem === item.id ? (
          <Box key='edit-box'>
            <Textfield
              key={`item-edit-${item.id}`}
              id={`item-edit-${item.id}`}
              defaultValue={startingEditValue}
              onChange={(e) => editVal.current = e.target.value}
            />
            <Button
              key={`save-edit-${item.id}`}
              id={`save-edit-${item.id}`}
              appearance="primary"
              onClick={() => handleSaveItemEdit(item.id, editVal.current)}
            >
              Save
            </Button>
            <Button
              key={`cancel-edit-${item.id}`}
              id={`cancel-edit-${item.id}`}
              appearance="subtle"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Inline alignBlock='center' space='space.050'>
            {item.status ? (
              <Lozenge appearance={statusLozenge[item.status]?.appearance}>
                {statusLozenge[item.status]?.label}
              </Lozenge>
            ) : null}
            <Box>
            <Text>{item.label}</Text>
            </Box>
          </Inline>
        )
      },
      {
        content: (
          <Select
            id={`status-select-${item.id}`}
            name="Select status"
            appearance="subtle"
            options={statusOptions}
            value={statusOptions.find(option => option.value === item.status) || statusOptions[0]}
            onChange={(selectedOption) => handleStatusSelect(item.id, selectedOption)}
          />
        ),
      },
      {
        content: (
          <Inline>
            <Button
              appearance='subtle'
              iconBefore="edit"
              onClick={() => handleEdit(item.id, item.label)}
            />
            <Button
              appearance='subtle'
              iconBefore="cross-circle"
              onClick={() => handleDelete(item.id)}
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
        key: 'update-status',
        content: 'Update status',
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
      {showLicenseError ?
        <SectionMessage appearance='error'>Your Jira installation does not have an active license for this app. Please contact your admin to get an active license.</SectionMessage>
        :
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
              <LoadingButton appearance="primary" onClick={handleGenerateClick} isLoading={aiLoading}>Generate Custom List</LoadingButton>
            </Inline>
          </Inline>
          <Inline spread='space-between' space='space.200' alignBlock='center'>
          <ProgressBar value={progressValue} appearance={progressAppearance} />
          <Badge appearance='primary' max={false}>{completedItemsCount + '/' + totalItemsCount}</Badge>
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
      }
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
