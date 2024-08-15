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
  RequiredAsterisk
} from '@forge/react';

export const CreateNewTemplateModal = ({ handleAddTemplate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]); // State to hold the list of items
  const [newItemLabel, setNewItemLabel] = useState(''); // State to hold the value of the current item being added
  const [formError, setFormError] = useState(''); // State to hold form error messages
  
  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    setItems([]); // Reset items when modal closes
    setNewItemLabel(''); // Reset new item input
    setFormError(''); // Reset form error
  };

  const { handleSubmit, getFieldId, register } = useForm();

  const onSubmit = handleSubmit(data => {
    if (!data['template-name'].trim()) {
      setFormError('Template name is required.');
      return;
    }

    if (items.length === 0) {
      setFormError('At least one item is required.');
      return;
    }

    handleAddTemplate({
      name: data['template-name'],
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
                <Label labelFor={getFieldId('template-name')}>
                  Template name <RequiredAsterisk/>
                </Label>
                <Textfield 
                  {...register('template-name', { required: true })} 
                  aria-required="true"
                />

                <Label>
                  Add Items<RequiredAsterisk/>
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
