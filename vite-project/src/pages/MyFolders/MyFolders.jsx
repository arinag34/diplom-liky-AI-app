import styles from "./MyFolders.module.css";
import FolderCard from "../../helpers/FolderCard/FolderCard.jsx";
import { useEffect, useState } from "react";
import Header from "../../helpers/Header/Header.jsx";

const MyFolders = () => {
    const [folders, setFolders] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");

    useEffect(() => {
        fetchFolders();
    }, []);

    const fetchFolders = async () => {
        try {
            const response = await fetch('/api/folders', {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Error fetching folders');
            const data = await response.json();
            setFolders(data);
        } catch (error) {
            console.error('Error fetching folders:', error);
        }
    };

    const handleCreateFolder = async () => {
        try {
            const response = await fetch('/api/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ name: newFolderName })
            });

            if (!response.ok) throw new Error('Error creating folder');

            setNewFolderName("");
            setShowForm(false);
            fetchFolders(); // Обновить список
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    };

    return (
        <>
            <Header />
            <div className={styles.wrapper}>
                <div className={styles.createSection}>
                    <button
                        className={styles.toggleButton}
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? "Cancel" : "➕ Create Folder"}
                    </button>

                    {showForm && (
                        <div className={styles.form}>
                            <input
                                type="text"
                                placeholder="Folder name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className={styles.input}
                            />
                            <button
                                onClick={handleCreateFolder}
                                className={styles.createButton}
                                disabled={!newFolderName.trim()}
                            >
                                Create
                            </button>
                        </div>
                    )}
                </div>

                <div className={styles.foldersContainer}>
                    {folders.map((folder, index) => (
                        <FolderCard key={index} folder={folder} />
                    ))}
                </div>
            </div>
        </>
    );
};

export default MyFolders;
