import React from 'react';
import styles from './Message.module.css';

const Message = ({ onClose, header, text }) => {
    return (
        <div className={styles.overlay}>
            <div className={styles.popup}>
                <h2>{header}</h2>
                <p>{text}</p>
                <button onClick={onClose}>OK</button>
            </div>
        </div>
    );
};

export default Message;
