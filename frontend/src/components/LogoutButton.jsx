import { useAuth } from '../contexts/AuthContext';

const LogoutButton = () => {
  const { logOut } = useAuth();

  const handleLogout = () => {
    logOut();
  };

  return <button onClick={handleLogout} className='hover:cursor-pointer rounded-xl w-full py-2 px-5 font-bold bg-red-500/10 text-red-500 border-2 border-red-500'>Log out</button>;
};

export default LogoutButton;