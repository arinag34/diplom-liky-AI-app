import './App.css';
import { Route, Routes } from 'react-router-dom';
import MainPage from './pages/MainPage/MainPage.jsx';
import MyFolders from './pages/MyFolders/MyFolders.jsx';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import SettingsPage from './pages/Settings/SettingsPage.jsx';
import FolderContent from './pages/FolderContent/FolderContent.jsx';
import PrivateRoute from './helpers/PrivateRoute.jsx';

function App() {
    return (
        <div>
            <Routes>
                <Route path='/' element={<MainPage />} />
                <Route path='/login' element={<Login />} />
                <Route path='/registration' element={<Register />} />
                <Route
                    path='/my-folders'
                    element={
                        <PrivateRoute>
                            <MyFolders />
                        </PrivateRoute>
                    }
                />
                <Route
                    path='/my-folders/:folder-name'
                    element={
                        <PrivateRoute>
                            <FolderContent />
                        </PrivateRoute>
                    }
                />
                <Route
                    path='/settings'
                    element={
                        <PrivateRoute>
                            <SettingsPage />
                        </PrivateRoute>
                    }
                />
            </Routes>
        </div>
    );
}

export default App;
