import { useEffect, useState } from 'react';
import styles from './SettingsPage.module.css';

const SettingsPage = () => {
    const [autoThreshold, setAutoThreshold] = useState(90);
    const [createThreshold, setCreateThreshold] = useState(50);
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetch('/api/user/settings', {
            credentials: 'include'
        })
            .then(res => {
                if (!res.ok) throw new Error('Error fetching settings');
                return res.json();
            })
            .then(data => {
                setAutoThreshold(data.threshold_auto_move);
                setCreateThreshold(data.threshold_create_new_folder);
            })
            .catch(err => {
                console.error('Error fetching settings:', err);
                setStatus('Could not fetch settings');
            });
    }, []);

    const handleSave = () => {
        fetch('/api/user/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                threshold_auto_move: autoThreshold,
                threshold_create_new_folder: createThreshold
            })
        })
            .then(res => {
                if (!res.ok) throw new Error('Error saving settings');
                return res.json();
            })
            .then(() => setStatus('✅ Settings saved!'))
            .catch(() => setStatus('❌ Error saving settings'));
    };

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>Settings</h2>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Auto-move threshold (%)</label>
                <input
                    type="number"
                    className={styles.input}
                    value={autoThreshold}
                    onChange={e => setAutoThreshold(Number(e.target.value))}
                    min={0}
                    max={100}
                />
            </div>

            <div className={styles.inputGroup}>
                <label className={styles.label}>Creating new folder threshold (%)</label>
                <input
                    type="number"
                    className={styles.input}
                    value={createThreshold}
                    onChange={e => setCreateThreshold(Number(e.target.value))}
                    min={0}
                    max={100}
                />
            </div>

            <button className={styles.button} onClick={handleSave}>Save</button>

            {status && <p className={styles.status}>{status}</p>}
        </div>
    );
};

export default SettingsPage;
