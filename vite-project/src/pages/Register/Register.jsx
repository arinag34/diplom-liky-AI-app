import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./Register.module.css";

const Register = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const navigate = useNavigate();

    const validateEmail = (value) => {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(value);
    };

    const validatePassword = (value) => {
        return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);

        if (!isEmailValid) {
            setEmailError("Invalid email format.");
        }
        if (!isPasswordValid) {
            setPasswordError("Password must be at least 8 characters, include an uppercase letter and a number.");
        }

        if (!isEmailValid || !isPasswordValid) return;

        try {
            await axios.post('/api/register', {
                username,
                email,
                password
            }, { withCredentials: true });

            navigate('/login');
        } catch (err) {
            console.error(err);
            setError("Error registering user.");
        }
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (!validateEmail(e.target.value)) {
            setEmailError("Invalid email format.");
        } else {
            setEmailError("");
        }
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (!validatePassword(e.target.value)) {
            setPasswordError("Password must be at least 8 characters, include an uppercase letter and a number.");
        } else {
            setPasswordError("");
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleRegister} className={styles.form}>
                <h2 className={styles.title}>Create account</h2>

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={styles.input}
                />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    className={styles.input}
                />
                {emailError && <p className={styles.error}>{emailError}</p>}

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    className={styles.input}
                />
                {passwordError && <p className={styles.error}>{passwordError}</p>}

                <button type="submit" className={styles.button}>Register</button>
                <a href="/login" className={styles.link}>Already have an account? Login</a>
                {error && <p className={styles.error}>{error}</p>}
            </form>
        </div>
    );
};

export default Register;
