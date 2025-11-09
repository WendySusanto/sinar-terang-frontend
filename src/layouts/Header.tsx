import { Menu, Moon, Receipt, Settings, Sun, User } from "lucide-react";
import { useSideBarContext } from "../contexts/SidebarContext";
import { useThemeContext } from "../contexts/ThemeContext";
import { useModeContext } from "../contexts/ModeContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Header() {
  const { toggle } = useSideBarContext();
  const { toggleDark, isDark } = useThemeContext();
  const { toggleAdmin, isAdminMode } = useModeContext();
  const navigate = useNavigate(); // Initialize useNavigate

  const [openSettings, setIsOpenSettings] = useState(false); // State to manage settings dropdown

  const handleAdminToggle = () => {
    toggleAdmin(); // Toggle admin mode
    if (!isAdminMode) {
      console.log("Entering admin mode");
      navigate("/cashier"); // Navigate to /cashier if entering admin mode
    } else {
      navigate("/"); // Navigate back to the main route if exiting admin mode
    }
  };

  return (
    <div className="flex items-center bg-primary-dark text-white min-h-18 px-4 fixed top-0 left-0 right-0 z-98 shadow-md ">
      {!isAdminMode && (
        <button className="lg:hidden items-center cursor-pointer mr-3 hidden sm:block text-white">
          <Menu onClick={() => toggle()} />
        </button>
      )}
      <div className="flex items-center text-2xl font-bold ml-3">
        <a href="/" className="text-white tracking-wide drop-shadow-sm">
          Sinar Terang
        </a>
      </div>
      <div className="flex items-center justify-end flex-1 mr-3">
        <button
          className="relative text-white cursor-pointer"
          onClick={() => setIsOpenSettings(!openSettings)}
        >
          <Settings />
          {openSettings && (
            <div className="absolute right-0 bg-background mt-2 whitespace-nowrap text-text py-3 px-4 shadow-lg rounded-md">
              <ul>
                <li className="flex items-center mb-2">
                  <span className="mr-5">Switch Mode</span>
                  <div
                    className={`relative ml-auto w-16 h-9 rounded-full transition-colors cursor-pointer ${
                      isAdminMode
                        ? "bg-background-dark dark:bg-gray-900"
                        : "bg-background-muted dark:bg-gray-100"
                    }`}
                    onClick={() => handleAdminToggle()}
                  >
                    <User
                      className={`absolute top-2 right-2 w-5 h-5 transition-opacity ${
                        isAdminMode
                          ? "opacity-0"
                          : "opacity-100 text-primary-dark"
                      }`}
                    ></User>
                    <Receipt
                      className={`absolute top-2 left-2 w-5 h-5 transition-opacity ${
                        isAdminMode ? "opacity-100 text-white" : "opacity-0"
                      }`}
                    ></Receipt>
                    <span
                      className={`absolute top-2 left-2 w-5 h-5 rounded-full shadow-md transition-transform ${
                        isAdminMode
                          ? "translate-x-7 bg-white"
                          : "translate-x-0 bg-gray-900"
                      }`}
                    />
                  </div>
                </li>
                <li className="flex items-center mb-2">
                  <span className="mr-6">Dark Mode</span>
                  <div
                    className={`relative ml-auto w-16 h-9 rounded-full transition-colors cursor-pointer ${
                      isDark
                        ? "bg-background-dark dark:bg-gray-900"
                        : "bg-background-muted dark:bg-gray-100"
                    }`}
                    onClick={() => toggleDark()}
                  >
                    <Sun
                      className={`absolute top-2 right-2 w-5 h-5 transition-opacity ${
                        isDark ? "opacity-0" : "opacity-100 text-primary-dark"
                      }`}
                    />
                    <Moon
                      className={`absolute top-2 left-2 w-5 h-5 transition-opacity ${
                        isDark ? "opacity-100 text-white" : "opacity-0"
                      }`}
                    />
                    <span
                      className={`absolute top-2 left-2 w-5 h-5 rounded-full shadow-md transition-transform ${
                        isDark
                          ? "translate-x-7 bg-white"
                          : "translate-x-0 bg-gray-900"
                      }`}
                    />
                  </div>
                </li>
              </ul>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
