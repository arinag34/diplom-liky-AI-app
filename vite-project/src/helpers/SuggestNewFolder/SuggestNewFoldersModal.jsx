import React, { useState } from 'react';
import styles from './SuggestNewFoldersModal.module.css';

const SuggestNewFoldersModal = ({
                                    suggestions = [],
                                    folders = [],
                                    onCreateFolder,
                                    onChooseExisting,
                                    onClose
                                }) => {
    const [selectedExisting, setSelectedExisting] = useState(folders[0]?.id || '');
    const [editableSuggestions, setEditableSuggestions] = useState(
        suggestions.map(name => ({ name, edited: name }))
    );

    const handleEditChange = (index, newValue) => {
        setEditableSuggestions(prev =>
            prev.map((item, i) => i === index ? { ...item, edited: newValue } : item)
        );
    };

    const handleCreate = (index) => {
        const name = editableSuggestions[index].edited.trim();
        if (name) {
            onCreateFolder(name);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h2>Your link doesn't match any of your folders</h2>

                <h3>Create new folder:</h3>
                <div className={styles.suggestions}>
                    {editableSuggestions.map((item, idx) => (
                        <div key={idx} className={styles.editableRow}>
                            <input
                                type="text"
                                value={item.edited}
                                onChange={e => handleEditChange(idx, e.target.value)}
                                className={styles.input}
                            />
                            <button
                                onClick={() => handleCreate(idx)}
                                className={styles.saveButton}
                            >
                                Save
                            </button>
                        </div>
                    ))}
                </div>

                <div className={styles.chooseMyself}>
                    <span>Choose myself:</span>
                    <select
                        value={selectedExisting}
                        onChange={(e) => setSelectedExisting(e.target.value)}
                    >
                        <option value="" disabled>Select folder</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                    <button onClick={() => onChooseExisting(selectedExisting)}>
                        Add Link
                    </button>
                </div>

                <button className={styles.closeButton} onClick={onClose}>×</button>
            </div>
        </div>
    );
};

export default SuggestNewFoldersModal;
