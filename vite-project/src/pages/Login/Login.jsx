import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from './Login.module.css';

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/login', {
                email,
                password
            }, { withCredentials: true });

            localStorage.setItem('userId', response.data.userId);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError("Wrong email or password");
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleLogin} className={styles.form}>
                <h2 className={styles.title}>Login</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={styles.input}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={styles.input}
                />
                <button type="submit" className={styles.button}>Login</button>
                <a href="/registration" className={styles.link}>Create account</a>
                {error && <p className={styles.error}>{error}</p>}
            </form>
        </div>
    );
};

export default Login;
