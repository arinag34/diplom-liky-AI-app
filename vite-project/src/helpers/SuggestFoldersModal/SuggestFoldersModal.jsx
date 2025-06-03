import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './SuggestFoldersModal.module.css';

const SuggestFoldersModal = ({ visible, topFolders, allFolders, onSelect, onClose }) => {
    const [selectedExisting, setSelectedExisting] = useState(allFolders[0]?.id || '');

    if (!visible) return null;

    return ReactDOM.createPortal(
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h2>Top matching folders</h2>

                <div className={styles.suggestions}>
                    {topFolders.map(folder => (
                        <button
                            key={folder.id}
                            className={styles.suggestionButton}
                            onClick={() => onSelect(folder.id)}
                        >
                            {folder.name}
                        </button>
                    ))}
                </div>

                <div className={styles.chooseMyself}>
                    <span>Choose myself:</span>
                    <select
                        value={selectedExisting}
                        onChange={(e) => setSelectedExisting(e.target.value)}
                    >
                        <option value="" disabled>Select folder</option>
                        {allFolders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                    <button onClick={() => onSelect(selectedExisting)}>
                        Add Link
                    </button>
                </div>

                <button className={styles.closeButton} onClick={onClose}>×</button>
            </div>
        </div>,
        document.body
    );
};

export default SuggestFoldersModal;
