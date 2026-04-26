import { useState, useEffect } from 'react'
import { Plus, Trash2, Video, AlertTriangle } from 'lucide-react'

interface Camera {
  id: number
  name: string
  rtsp_url: string
  is_enabled: boolean
  status: string
}

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCam, setNewCam] = useState({ name: '', rtsp_url: '' })

  const fetchCameras = () => {
    fetch('/api/v1/cameras')
      .then(res => res.json())
      .then(setCameras)
      .catch(err => console.error('Fetch error:', err))
  }

  useEffect(() => {
    fetchCameras()
  }, [])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    fetch('/api/v1/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCam)
    }).then(res => {
      if (res.ok) {
        setShowAddModal(false)
        setNewCam({ name: '', rtsp_url: '' })
        fetchCameras()
      }
    })
  }

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to remove this camera?')) {
      fetch(`/api/v1/cameras/${id}`, { method: 'DELETE' })
        .then(res => {
          if (res.ok) fetchCameras()
        })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Camera Management</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg"
        >
          <Plus size={18} />
          Add Camera
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {cameras.map((cam) => (
          <div key={cam.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${cam.status === 'Streaming' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`}></div>
                <h3 className="font-bold text-lg">{cam.name}</h3>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">ID: {cam.id}</span>
              </div>
              <button 
                onClick={() => handleDelete(cam.id)}
                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                title="Remove Camera"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Preview Container */}
            <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
              {cam.status === 'Streaming' || cam.status === 'Connected' ? (
                <img 
                  src={`/api/v1/stream/${cam.id}`} 
                  alt={cam.name} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/640x360?text=Stream+Error';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Video size={48} strokeWidth={1} />
                  <p className="text-sm font-medium">{cam.status || 'Offline'}</p>
                </div>
              )}
              
              {/* Overlay info */}
              <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-[10px] font-mono text-gray-300 backdrop-blur-sm border border-white/10">
                {cam.rtsp_url.split('@').pop()?.split('/')[0] || 'Unknown Host'}
              </div>
            </div>

            {/* Footer / Controls */}
            <div className="p-4 flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <AlertTriangle size={14} className={cam.status === 'Error' ? 'text-red-400' : 'text-gray-500'} />
                <span>Last status: {cam.status}</span>
              </div>
              <div className="flex gap-2">
                {/* Future controls like Settings, Fullscreen, etc */}
              </div>
            </div>
          </div>
        ))}

        {cameras.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center gap-4 text-gray-500">
            <Video size={64} strokeWidth={1} />
            <div className="text-center">
              <p className="text-xl font-bold text-gray-400">No cameras added yet</p>
              <p className="text-sm">Click the "Add Camera" button to start monitoring.</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-700 bg-gray-900/30">
              <h2 className="text-xl font-bold">Add New RTSP Camera</h2>
              <p className="text-sm text-gray-400 mt-1">Connect a new stream to the VMS Lite engine.</p>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Camera Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  placeholder="e.g., Warehouse Entrance"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  value={newCam.name}
                  onChange={e => setNewCam({...newCam, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">RTSP Stream URL</label>
                <input 
                  required
                  type="text" 
                  placeholder="rtsp://user:pass@ip:port/stream"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono text-sm"
                  value={newCam.rtsp_url}
                  onChange={e => setNewCam({...newCam, rtsp_url: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all"
                >
                  Save Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
