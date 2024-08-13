import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Select, Label, DynamicTable, Button, Inline, Strong, Box, Icon } from '@forge/react';
import { invoke } from '@forge/bridge';
import uuid from 'uuid-random';

const App = () => {
  const [lists, setLists] = useState([]);
  const [listInUse, setlistInUse] = useState([]);
  useEffect(() => {
    async function asyncListSetter() {
      const availableLists = await invoke('getLists')
      console.log('---LISTS----')
      console.log(availableLists)
      setLists(availableLists)
      return availableLists
    }
    async function asyncSelectedSetter(availableLists) {
      const activeList = await invoke('getActiveList')
      if (activeList) {
        setlistInUse(activeList.items)
      }
      if (!activeList) {
        const defaultList = availableLists.find(l => l.default === true)
        const toSetSelected = defaultList ? defaultList : availableLists.find(list => list.name === 'OWASP') ? availableLists.find(list => list.name === 'OWASP') : {}
        if (toSetSelected.items && !toSetSelected.items[0].id) {
          toSetSelected.items.map(item => item.id = uuid())
        }
        setlistInUse(toSetSelected.items)
      }
    }
    asyncListSetter().then(asyncSelectedSetter)
  }, []);
  useEffect(() => {
    console.log('---listInUse udpated----')
    console.log(listInUse)
  }, [listInUse])

  function selectTemplateAction(action) {
    console.log('--------selectTemplateAction-----')
    console.log(action)
  }


  const actionOptions = [
    { label: 'Checked', key: 'checked' },
    { label: 'Needs review', key: 'needs-review' },
    { label: 'N/A', key: 'not-applicable' }
  ]
  const tableRows = listInUse.map((item, index) => ({
    key: item.label,
    cells: [
      { content: item.label },
      {
        content:
          <Select
            id={`action-select-${index}`}
            name='Select action'
            appearance="subtle"
            options={(actionOptions.map(option => ({
              label: option.label,
              key: `${option.label} ${index}`,
            })) || [])}
          />
      },
      {
        content: <Icon glyph="cross-circle" label="Delete" />
      },
      {
        comment: item.comment
      }
    ]
  }))

  const tableColumns = {
    cells: [
      {
        key: 'item',
        content: 'Item',
        isSortable: true
      },
      {
        key: 'action',
        content: 'Action',
        isSortable: true
      },
      {
        key: 'delete',
        content: 'Delete'
      },
    ]
  }
  return (
    <>
      {listInUse.length < 1 &&
        <Inline alignBlock='stretch' alignInline='center'>
          <Label labelFor='select-template-list'>Select template:</Label>
          <Select
            id='select-template-list'
            name='Select template list'
            appearance="subtle"
            options={(lists.map(list => ({
              label: list.name,
              key: list.name,
            })) || [])}
            onChange={selectTemplateAction}
          />
          <Text><Strong>OR</Strong></Text>
          <Button appearance='primary'>Generate List (AI)</Button>
        </Inline>}

      <DynamicTable
        head={tableColumns}
        rows={tableRows}
        rowsPerPage={20}
        emptyView='Select a template or generate items'
        isRankable
      />
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
