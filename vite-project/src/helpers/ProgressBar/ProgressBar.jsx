import React from 'react';
import styles from './ProgressBar.module.css';

const ProgressBar = ({ visible }) => {
    if (!visible) return null;
    return (
        <div className={styles.wrapper}>
            <div className={styles.progress} />
        </div>
    );
};

export default ProgressBar;
