import { useState, useEffect } from 'react'
import { Activity, Camera, Bell, Terminal } from 'lucide-react'

interface Status {
  uptime_seconds: number
  camera_count: number
  detections_today: number
}

interface DetectionEvent {
  type: string
  id: number
  camera_id: number
  timestamp: number
  label: string
  confidence: number
  webhook_response: string
}

export default function Dashboard() {
  const [status, setStatus] = useState<Status | null>(null)
  const [events, setEvents] = useState<DetectionEvent[]>([])

  useEffect(() => {
    // Initial status fetch
    fetch('/api/v1/status')
      .then(res => res.json())
      .then(setStatus)
      .catch(err => console.error('Status fetch error:', err))

    // Set up WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/events`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'detection') {
        setEvents(prev => [data, ...prev].slice(0, 50))
        // Increment detections today in UI
        setStatus(prev => prev ? { ...prev, detections_today: prev.detections_today + 1 } : null)
      }
    }

    return () => ws.close()
  }, [])

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Server Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-green-900/50 text-green-400 rounded-full">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Server Uptime</p>
            <p className="text-xl font-bold">{status ? formatUptime(status.uptime_seconds) : 'Loading...'}</p>
          </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-blue-900/50 text-blue-400 rounded-full">
            <Camera size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Active Cameras</p>
            <p className="text-xl font-bold">{status ? status.camera_count : '...'}</p>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-purple-900/50 text-purple-400 rounded-full">
            <Bell size={24} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Detections Today</p>
            <p className="text-xl font-bold">{status ? status.detections_today : '...'}</p>
          </div>
        </div>
      </div>

      {/* Live Log */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[500px]">
        <div className="p-4 border-b border-gray-700 flex items-center gap-2">
          <Terminal size={18} className="text-gray-400" />
          <h2 className="font-semibold">Live Detection Log</h2>
          <span className="ml-auto flex items-center gap-1 text-xs text-green-400 animate-pulse">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            Live
          </span>
        </div>
        
        <div className="flex-1 overflow-auto p-4 font-mono text-sm space-y-2">
          {events.length === 0 ? (
            <p className="text-gray-500 italic">Waiting for events...</p>
          ) : (
            events.map((event, i) => (
              <div key={i} className="border-l-2 border-blue-500 pl-3 py-1 bg-gray-900/50 rounded-r-md">
                <div className="flex justify-between text-gray-400 text-xs mb-1">
                  <span>{new Date(event.timestamp * 1000).toLocaleTimeString()}</span>
                  <span>Camera #{event.camera_id}</span>
                </div>
                <div>
                  Detected <span className="text-yellow-400 font-bold uppercase">{event.label}</span> with 
                  <span className="text-blue-400 ml-1">{(event.confidence * 100).toFixed(1)}%</span> confidence
                </div>
                {event.webhook_response && (
                  <div className="mt-1 text-xs text-gray-500 italic">
                    Webhook: {event.webhook_response.length > 50 ? event.webhook_response.substring(0, 50) + '...' : event.webhook_response}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
