import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const app = express();
const PORT = 5000;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'linkyApp',
    password: 'Arina2004',
    port: 5432,
});

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: 'linky_app_123_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// --- Анализ ссылки
app.post('/api/analyze-link', async (req, res) => {
    const { link } = req.body;
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error:'Not authorized' });
    if (!link)   return res.status(400).json({ error:'No link provided' });

    try {
        const foldersRes = await pool.query(
            'SELECT id, name FROM folders WHERE user_id=$1', [userId]
        );
        const folders = foldersRes.rows;

        const userRes = await pool.query(
            'SELECT threshold_auto_move, threshold_create_new_folder FROM users WHERE id=$1',
            [userId]
        );
        const { threshold_auto_move, threshold_create_new_folder } = userRes.rows[0];

        const params = JSON.stringify({
            link,
            folders,
            auto_threshold: threshold_auto_move,
            suggest_threshold: threshold_create_new_folder
        });

        const py = spawn('python', ['../scripts/analyze_link.py', params]);

        let out = '';
        let err = '';

        py.stdout.on('data', chunk => { out += chunk.toString(); });
        py.stderr.on('data', chunk => {
            console.warn('Python stderr (ignored):', chunk.toString());
        });

        py.on('close', code => {
            if (code !== 0) {
                console.error('Python exited with code', code);
                return res.status(500).json({ error: 'Analysis failed (exit code ' + code + ')' });
            }
            try {
                const result = JSON.parse(out);
                return res.json(result);
            } catch (e) {
                console.error('JSON parse error:', e, 'stdout:', out);
                return res.status(500).json({ error: 'Bad JSON from script' });
            }
        });

    } catch(e) {
        console.error(e);
        res.status(500).json({ error:'Server error' });
    }
});

// --- Получение папок
app.get('/api/folders', async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const result = await pool.query('SELECT id, name FROM folders WHERE user_id = $1', [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching folders');
    }
});

// --- Регистрация
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await pool.query(
            'INSERT INTO users (username, email, password, threshold_auto_move, threshold_create_new_folder) VALUES ($1, $2, $3, $4, $5)',
            [username, email, hashedPassword, 90, 50]
        );
        res.status(201).send('User registered');
    } catch (error) {
        console.error("Error registering:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Логин
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).send('User does not exist');
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).send('Wrong password');
        }

        req.session.userId = user.id;
        res.json({ userId: user.id });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error authorizing');
    }
});

// --- Создание новой папки
app.post('/api/folders', async (req, res) => {
    const userId = req.session.userId;
    const { name } = req.body;

    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const result = await pool.query(
            'INSERT INTO folders (user_id, name) VALUES ($1, $2) RETURNING *',
            [userId, name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).send('Error creating folder');
    }
});

// --- Добавление ссылки чере папку
app.post('/api/folders/links', async (req, res) => {
    const userId = req.session.userId;
    const { folder_id, url, description } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!folder_id || !url) {
        return res.status(400).json({ error: 'Missing folder_id or url' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO links (user_id, folder_id, url, description) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, folder_id, url, description || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating link:', error);
        res.status(500).json({ error: 'Error creating link' });
    }
});

// --- Добавление ссылки чере ШИ
app.post('/api/links', async (req, res) => {
    const userId = req.session.userId;
    const { folder_id, url } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!folder_id || !url) return res.status(400).json({ error: 'No folder and url' });

    try {
        const py = spawn('python', ['../scripts/summarize_link.py', url]);

        let out = '';
        py.stdout.on('data', chunk => { out += chunk.toString(); });

        py.on('close', async (code) => {
            if (code !== 0) {
                console.warn('Python exited with code', code);
                return res.status(500).json({ error: 'Summarization failed' });
            }

            console.log('--- Python output START ---');
            console.log(out);
            console.log('--- Python output END ---');

            try {
                const parsed = JSON.parse(out);
                const description = parsed.summary || 'No desc';

                const result = await pool.query(
                    `INSERT INTO links (folder_id, url, description, user_id)
             VALUES ($1, $2, $3, $4) RETURNING *`,
                    [folder_id, url, description, userId]
                );
                res.status(201).json(result.rows[0]);
            } catch (e) {
                console.error('Error creating description:', e);
                res.status(500).json({ error: 'Error creating description' });
            }
        });

    } catch (error) {
        console.error('Ошибка при добавлении ссылки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// --- Получение настроек пользователя
app.get('/api/user/settings', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const result = await pool.query(
            'SELECT threshold_auto_move, threshold_create_new_folder FROM users WHERE id = $1',
            [userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching settings' });
    }
});

// --- Обновление настроек пользователя
app.post('/api/user/settings', async (req, res) => {
    const userId = req.session.userId;
    const { threshold_auto_move, threshold_create_new_folder } = req.body;

    if (!userId) return res.status(401).json({ error: 'Not authorized' });

    try {
        await pool.query(
            'UPDATE users SET threshold_auto_move = $1, threshold_create_new_folder = $2 WHERE id = $3',
            [threshold_auto_move, threshold_create_new_folder, userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при обновлении настроек' });
    }
});

// --- Получить ссылки по имени папки
app.get('/api/folder-links/:name', async (req, res) => {
    const userId = req.session.userId;
    const folderName = req.params.name;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const folderRes = await pool.query(
            'SELECT id FROM folders WHERE user_id = $1 AND name = $2',
            [userId, folderName]
        );
        if (folderRes.rowCount === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folderId = folderRes.rows[0].id;

        const linksRes = await pool.query(
            'SELECT id, url, description FROM links WHERE user_id = $1 AND folder_id = $2',
            [userId, folderId]
        );

        res.json(linksRes.rows);
    } catch (err) {
        console.error('Error fetching links:', err);
        res.status(500).json({ error: 'Error fetching links' });
    }
});

// --- Редактировать описание ссылки
app.put('/api/links/:id/description', async (req, res) => {
    const { id } = req.params;
    const { description } = req.body;
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const result = await pool.query(
            `UPDATE links SET description=$1 WHERE id=$2 AND user_id=$3 RETURNING *`,
            [description, id, userId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Link not found' });
        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});


app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
