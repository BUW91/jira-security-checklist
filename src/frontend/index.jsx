import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Select, Label, DynamicTable, Button, Inline, Strong, Box, Icon, useProductContext, LoadingButton } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const [lists, setLists] = useState([]);
  const [listInUse, setlistInUse] = useState([]);
  const [aiLoading, setAiLoading] = useState(false)

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
          : availableLists.find(list => list.name === 'OWASP') || {};
        if (toSetSelected.items && !toSetSelected.items[0].id) {
          toSetSelected.items = toSetSelected.items.map(item => ({
            ...item,
          }));
        }
        setlistInUse(toSetSelected.items);
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
    const selectedTemplate = e.key;

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
    const generatedList = await invoke('getGeneratedList', {issueKey: context.extension.issue.key})
    setAiLoading(false)
    if (!Array.isArray(generatedList)){
      console.error('The generated list was not an array', generatedList)
      return
    }
    setlistInUse(generatedList)
  }

  const actionOptions = [
    { label: 'Checked', key: 'checked' },
    { label: 'Needs review', key: 'needs-review' },
    { label: 'N/A', key: 'not-applicable' }
  ];

  const tableRows = context && listInUse ? listInUse.map((item, index) => ({
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
        <LoadingButton appearance="primary" onClick={handleGenerateClick} isLoading={aiLoading}>Generate List (AI)</LoadingButton>
      </Inline>

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
