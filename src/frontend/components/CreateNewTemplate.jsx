import React, { useState } from 'react';
import {
  Button, 
  Box,
  Modal,
  ModalBody,
  ModalTransition,
  ModalTitle,
  ModalFooter,
  ModalHeader,
  Form,
  useForm,
  Text,
  Textfield,
  Label,
  Heading,
  DynamicTable,
  Inline,
  ErrorMessage,
  RequiredAsterisk,
  Select, // Import Select component
} from '@forge/react';

import owasp2021 from '../../default-lists/owasp2021'
import owaspApi2023 from '../../default-lists/owaspApi2023';


export const CreateNewTemplateModal = ({ handleAddTemplate }) => {
  const presetTemplates = [owasp2021, owaspApi2023]
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]); // State to hold the list of items
  const [newItemLabel, setNewItemLabel] = useState(''); // State to hold the value of the current item being added
  const [formError, setFormError] = useState(''); // State to hold form error messages
  const [templateName, setTemplateName] = useState('');

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    setItems([]); // Reset items when modal closes
    setNewItemLabel(''); // Reset new item input
    setFormError(''); // Reset form error
  };

  const { handleSubmit, getFieldId, register } = useForm();

  const onSubmit = handleSubmit(data => {
    if (!templateName.trim()) {
      setFormError('Template name is required.');
      return;
    }

    if (items.length === 0) {
      setFormError('At least one item is required.');
      return;
    }

    handleAddTemplate({
      name: templateName,
      items: items // Pass the list of items
    });
    closeModal(); // Close the modal after submitting
  });

  const addItem = () => {
    if (newItemLabel.trim()) {
      setItems([...items, {label: newItemLabel}]);
      setNewItemLabel(''); // Clear the input field after adding an item
      setFormError(''); // Clear any previous error when adding an item
    }
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const columns = {
    cells: [
      {
        key: "item",
        content: "Item",
      },
      {
        key: "actions",
        content: "",
        width: 10
      }
    ]
  };

  const handleRankEnd = (sourceIndex, destinationIndex) => {
    if (destinationIndex === undefined || destinationIndex === sourceIndex) {
      return;
    }
  
    const updatedItems = Array.from(items);
    const [movedItem] = updatedItems.splice(sourceIndex, 1); // Remove the item from the source index
    updatedItems.splice(destinationIndex, 0, movedItem); // Insert the item at the destination index
  
    setItems(updatedItems); // Update the state with the reordered items
  };
  
  const formatRows = (items) => {
    if (!items){
      return
    }
    const rows = items.map((item, index) => ({
      key: 'item' + index,
      cells: [
        {
          content: 
            item.label
        },
        {
          content: (
            <Inline>
              <Button
                appearance='subtle'
                iconBefore="cross-circle"
                onClick={() => removeItem(index)}
              />
            </Inline>
          ),
        }
      ],
    }));

    return rows;
  };

  const handlePresetChange = (event) => {
    if (event) {
      setTemplateName(event.label)
      const presetTemplate = presetTemplates.find(template => template.name === event.label);
      if (presetTemplate) {
        setItems(presetTemplate.items);
      }
    } else {
      setTemplateName('')
      setItems([]);
    }
  };

  return (
    <>
      <Button
        appearance='subtle'
        iconBefore="add"
        onClick={openModal}
      >
        <Heading as='h2'>Add new template</Heading>
      </Button>

      <ModalTransition>
        {isOpen && (
          <Modal onClose={closeModal}>
            <Form onSubmit={onSubmit}>
              <ModalHeader>
                <ModalTitle>Create a new template</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <Label labelFor="preset-template">
                  Or choose from a prebuild template
                </Label>
                <Select
                  inputId="preset-template"
                  onChange={handlePresetChange}
                  options={presetTemplates.map(template => ({
                    label: template.name,
                    value: template.name
                  }))}
                  placeholder="Select a preset template"
                  isClearable={true}
                />

                <Label labelFor="template-name">
                  Template name <RequiredAsterisk/>
                </Label>
                <Textfield 
                  inputId="template-name"
                  aria-required="true"
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value)
                  }}
                />

                <Label>
                  Add Items
                </Label>
                <Box>
                  <Textfield
                    value={newItemLabel}
                    onChange={e => setNewItemLabel(e.target.value)}
                  />
                  <Button
                    appearance="primary"
                    onClick={addItem}
                    type="button"
                    style={{ marginLeft: '10px' }}
                  >
                    Add Item
                  </Button>
                </Box>
                <Box>
                </Box>
                <DynamicTable
                  head={columns}
                  rows={formatRows(items)}
                  isRankable
                  onRankEnd={({ sourceIndex, destination }) => handleRankEnd(sourceIndex, destination.index)}
                ></DynamicTable>
                {formError && <ErrorMessage>{formError}</ErrorMessage>}
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={closeModal}>
                  Close
                </Button>
                <Button appearance="primary" type="submit">
                  Create
                </Button>
              </ModalFooter>
            </Form>
          </Modal>
        )}
      </ModalTransition>
    </>
  );
};
