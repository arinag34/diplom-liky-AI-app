import styles from "./FolderCard.module.css"
import { useNavigate } from "react-router-dom";

const FolderCard = ({folder}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate(`/my-folders/${folder.name}`, {
            state: {
                folderId: folder.id
            }
        });
    };

    return(
        <div onClick={handleClick} className={styles.folderContainer}>
            <svg width="100px" height="100px" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                    <path
                        d="M853.333333 256H469.333333l-85.333333-85.333333H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v170.666667h853.333334v-85.333334c0-46.933333-38.4-85.333333-85.333334-85.333333z"
                        fill="#FFA000"></path>
                    <path
                        d="M853.333333 256H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v426.666667c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V341.333333c0-46.933333-38.4-85.333333-85.333334-85.333333z"
                        fill="#FFCA28"></path>
                </g>
            </svg>
            <div>
                {folder.name}
            </div>
        </div>
    )
}

export default FolderCard