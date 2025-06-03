import styles from './Header.module.css';
import { NavLink, useNavigate } from 'react-router-dom';

const Header = () => {
    const navigate = useNavigate();
    const user = localStorage.getItem('userId');

    const handleLogout = () => {
        localStorage.removeItem('userId');
        navigate('/');
    };

    return (
        <div className={styles.header}>
            <NavLink to="/" className={styles.link}>Home</NavLink>

            {user ? (
                <>
                    <NavLink to="/my-folders" className={styles.link}>My folders</NavLink>
                    <NavLink to="/settings" className={styles.link}>Settings</NavLink>
                    <NavLink to="/login" onClick={handleLogout} className={styles.link}>Logout</NavLink>
                </>
            ) : (
                <NavLink to="/login" className={styles.link}>Login</NavLink>
            )}
        </div>
    );
};

export default Header;
