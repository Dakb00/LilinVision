import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Database from './components/Database'
import Cameras from './components/Cameras'
import Settings from './components/Settings'
import { LayoutDashboard, Database as DbIcon, Camera, Settings as SettingsIcon } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('home')

  const tabs = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'database', label: 'Database', icon: DbIcon },
    { id: 'cameras', label: 'Cameras', icon: Camera },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white w-screen flex flex-col">
      {/* Sidebar / Top Nav */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">LV</div>
          <span className="font-bold text-xl tracking-tight">LilinVision</span>
        </div>
        
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon size={18} />
              <span className="hidden sm:inline font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {activeTab === 'home' && <Dashboard />}
        {activeTab === 'database' && <Database />}
        {activeTab === 'cameras' && <Cameras />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default App
