import { useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import styles from './FolderContent.module.css';

const FolderContent = () => {
    const { 'folder-name': folderName } = useParams();
    const [links, setLinks] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [editing, setEditing] = useState({});
    const [editDescriptions, setEditDescriptions] = useState({});

    const [showAddForm, setShowAddForm] = useState(false);
    const [newLink, setNewLink] = useState('');
    const [newDescription, setNewDescription] = useState('');

    const location = useLocation();
    const folderId = location.state?.folderId;

    useEffect(() => {
        fetch(`/api/folder-links/${encodeURIComponent(folderName)}`, {
            credentials: 'include'
        })
            .then(res => {
                if (!res.ok) throw new Error('Error fetching links');
                return res.json();
            })
            .then(data => setLinks(data))
            .catch(err => console.error('Error:', err));
    }, [folderName]);

    const toggleExpand = (id) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleEdit = (id, currentDescription) => {
        setEditing(prev => ({ ...prev, [id]: !prev[id] }));
        setEditDescriptions(prev => ({ ...prev, [id]: currentDescription || '' }));
    };

    const handleEditChange = (id, value) => {
        setEditDescriptions(prev => ({ ...prev, [id]: value }));
    };

    const saveDescription = async (id) => {
        const updated = editDescriptions[id];
        try {
            const res = await fetch(`/api/links/${id}/description`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: updated })
            });

            if (res.ok) {
                setLinks(prev =>
                    prev.map(link =>
                        link.id === id ? { ...link, description: updated } : link
                    )
                );
                setEditing(prev => ({ ...prev, [id]: false }));
            } else {
                alert('Failed to update description');
            }
        } catch (e) {
            console.error('Error updating description:', e);
        }
    };

    const handleAddLink = async () => {
        if (!newLink.trim() || !folderId) return;

        const res = await fetch('/api/folders/links', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folder_id: folderId,
                url: newLink.trim(),
                description: newDescription.trim()
            })
        });

        if (res.ok) {
            const created = await res.json();
            setLinks(prev => [...prev, created]);
            setNewLink('');
            setNewDescription('');
            setShowAddForm(false);
        } else {
            alert('Failed to add link');
        }
    };

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>
                Links from folder: <em>{folderName}</em>
            </h2>

            <button className={styles.addLinkBtn} onClick={() => setShowAddForm(prev => !prev)}>
                ➕ Add Link
            </button>

            {showAddForm && (
                <div className={styles.addForm}>
                    <input
                        type="text"
                        placeholder="https://your-link.com"
                        value={newLink}
                        onChange={e => setNewLink(e.target.value)}
                        className={styles.input}
                    />
                    <textarea
                        placeholder="Optional description"
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                        className={styles.textarea}
                    />
                    <button onClick={handleAddLink} className={styles.submitBtn}>
                        Save
                    </button>
                </div>
            )}

            {links.length === 0 && <p className={styles.emptyMessage}>There's no links in this folder yet.</p>}

            <ul className={styles.linkList}>
                {links.map(link => (
                    <li key={link.id} className={styles.linkItem}>
                        <div className={styles.linkHeader}>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.url}>
                                {link.url}
                            </a>
                            <button
                                onClick={() => toggleExpand(link.id)}
                                className={styles.expandButton}
                                title="Show description"
                            >
                                📄
                            </button>
                            <button
                                onClick={() => toggleEdit(link.id, link.description)}
                                className={styles.expandButton}
                                title="Edit description"
                            >
                                ✏️
                            </button>
                        </div>

                        {expanded[link.id] && (
                            <div className={styles.description}>
                                <strong>Description:</strong>
                                {editing[link.id] ? (
                                    <>
                                        <textarea
                                            value={editDescriptions[link.id]}
                                            onChange={e => handleEditChange(link.id, e.target.value)}
                                            className={styles.editTextarea}
                                        />
                                        <button
                                            onClick={() => saveDescription(link.id)}
                                            className={styles.expandButton}
                                        >
                                            ✔️
                                        </button>
                                    </>
                                ) : (
                                    <p>{link.description || 'No description available.'}</p>
                                )}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FolderContent;
