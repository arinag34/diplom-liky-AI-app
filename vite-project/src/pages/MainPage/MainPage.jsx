import styles from './MainPage.module.css';

import Header from "../../helpers/Header/Header.jsx";
import SuggestNewFoldersModal from "../../helpers/SuggestNewFolder/SuggestNewFoldersModal.jsx";
import SuggestFoldersModal from "../../helpers/SuggestFoldersModal/SuggestFoldersModal.jsx";
import Message from '../../helpers/Message/Message.jsx';
import ProgressBar from '../../helpers/ProgressBar/ProgressBar.jsx';

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const MainPage = () => {
    const navigate = useNavigate();

    const [link, setLink] = useState('');
    const [folders, setFolders] = useState([]);
    const [analysis, setAnalysis] = useState(null);

    const [showAIError, setShowAIError] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalChooseOpen, setModalChooseOpen] = useState(false);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSavingLink, setIsSavingLink] = useState(false);
    const [linkAdded, setLinkAdded] = useState(false);
    const [linkError, setLinkError] = useState(false);

    useEffect(() => {
        fetch('/api/folders', { credentials: 'include' })
            .then(res => res.json())
            .then(setFolders)
            .catch(console.error);
    }, []);

    const validateURL = (url) => {
        const pattern = /^(https?:\/\/)([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
        return pattern.test(url);
    };

    const handleAnaliseLink = async () => {
        if (!link.trim()) return;

        if (!validateURL(link)) {
            setLinkError(true);
            setTimeout(() => setLinkError(false), 3000);
            return;
        }

        if (!localStorage.getItem('userId')) {
            navigate('/login');
            return;
        }

        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/analyze-link', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link })
            });

            if (res.status === 500) {
                setShowAIError(true);
                return;
            }

            const data = await res.json();
            setAnalysis(data);

            if (data.action === 'suggest_new_folder') {
                setModalOpen(true);
            } else if (data.action === 'choose_existing_folder') {
                setModalChooseOpen(true);
            } else if (data.action === 'auto_add') {
                const saveRes = await fetch('/api/links', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folder_id: data.folder.id, url: link })
                });

                if (saveRes.ok) {
                    setLinkAdded(true);
                    setShowAIError(false);

                    setSuccessMessage(
                        <Message
                            onClose={() => setLinkAdded(false)}
                            header={'Link added'}
                            text={`Link auto-assigned to folder "${data.folder.name}" (similarity ${data.similarity}%)`}
                        />
                    );

                    setTimeout(() => {
                        setLinkAdded(false);
                    }, 3000);
                } else {
                    console.error('Failed to auto-save link');
                }
            }

        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const createFolderAndLink = async (name) => {
        setIsSavingLink(true);
        try {
            const resFolder = await fetch('/api/folders', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const newFolder = await resFolder.json();
            setFolders(prev => [...prev, newFolder]);

            await fetch('/api/links', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: newFolder.id, url: link })
            });

            setModalOpen(false);
            setLinkAdded(true);
            setTimeout(() => setLinkAdded(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingLink(false);
        }
    };

    const chooseExistingLink = async (folderId) => {
        setIsSavingLink(true);
        try {
            await fetch('/api/links', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: folderId, url: link })
            });

            setModalChooseOpen(false);
            setModalOpen(false); // just in case
            setLinkAdded(true);
            setTimeout(() => setLinkAdded(false), 3000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSavingLink(false);
        }
    };

    return (
        <>
            {showAIError && <Message onClose={() => setShowAIError(false)} header={'Limited access'} text={"The page you are trying to access is blocking bot and AI activity, so we couldn't save your link. You can add the link manually to the corresponding folder.."}/>}
            {successMessage}
            <Header />

            <main className={styles.mainContent}>
                <div className={styles.linkForm}>
                    <input
                        className={styles.input}
                        type="text"
                        value={link}
                        placeholder="https://enter_your_link"
                        onChange={e => setLink(e.target.value)}
                        disabled={isAnalyzing || isSavingLink}
                    />
                    <button
                        className={styles.button}
                        onClick={handleAnaliseLink}
                        disabled={isAnalyzing || isSavingLink}
                    >
                        Analyze
                    </button>
                </div>

                {linkAdded && <div className={styles.successMessage}> ✅ Link added</div>}
                {linkError && <div className={styles.error}> ❌ Invalid URL format</div>}


                <ProgressBar visible={isAnalyzing || isSavingLink} />
            </main>

            {modalOpen && analysis?.action === 'suggest_new_folder' && (
                <SuggestNewFoldersModal
                    suggestions={analysis.suggestions}
                    folders={folders}
                    onCreateFolder={createFolderAndLink}
                    onChooseExisting={chooseExistingLink}
                    onClose={() => setModalOpen(false)}
                />
            )}

            {modalChooseOpen && analysis?.action === 'choose_existing_folder' && (
                <SuggestFoldersModal
                    visible={modalChooseOpen}
                    topFolders={analysis.options}
                    allFolders={folders}
                    onSelect={chooseExistingLink}
                    onClose={() => setModalChooseOpen(false)}
                />
            )}
        </>
    );
};

export default MainPage;
